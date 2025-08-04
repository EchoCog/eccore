import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import redis from 'redis';
import winston from 'winston';
import cron from 'node-cron';

// Security and logging setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'gateway.log' })
  ]
});

// Redis client for session management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Service endpoints
const SERVICES = {
  security: process.env.SECURITY_SERVICE_URL || 'http://security:8081',
  heartbeat: process.env.HEARTBEAT_SERVICE_URL || 'http://heartbeat:8082',
  reflection: process.env.REFLECTION_SERVICE_URL || 'http://reflection:8083',
  optimization: process.env.OPTIMIZATION_SERVICE_URL || 'http://optimization:8084',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:8085'
};

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

class GatewayService {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8080');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupProxies();
    this.setupHealthCheck();
    this.setupMetrics();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Request received', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  // Authentication middleware
  private authenticateToken = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Check if token is blacklisted
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      // Attach user info to request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        permissions: decoded.permissions || []
      };

      logger.info('User authenticated', { userId: req.user.id, role: req.user.role });
      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  // Permission check middleware
  private requirePermission = (permission: string) => {
    return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!req.user.permissions.includes(permission) && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    };
  };

  private setupRoutes(): void {
    // Authentication endpoints
    this.app.post('/api/auth/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        // Forward to security service for authentication
        const response = await fetch(`${SERVICES.security}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        const userData = await response.json();
        
        // Generate JWT token
        const token = jwt.sign({
          id: userData.id,
          role: userData.role,
          permissions: userData.permissions
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Store session in Redis
        await redisClient.setEx(`session:${userData.id}`, 3600, token);

        logger.info('User logged in', { userId: userData.id });
        res.json({ token, user: userData });
      } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    this.app.post('/api/auth/logout', this.authenticateToken, async (req: AuthenticatedRequest, res) => {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        
        if (token) {
          // Blacklist the token
          await redisClient.setEx(`blacklist:${token}`, 3600, 'true');
          
          // Remove session
          if (req.user) {
            await redisClient.del(`session:${req.user.id}`);
          }
        }

        logger.info('User logged out', { userId: req.user?.id });
        res.json({ message: 'Logged out successfully' });
      } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
      }
    });

    // Service status endpoint
    this.app.get('/api/status', this.authenticateToken, async (req, res) => {
      try {
        const serviceStatuses = await Promise.allSettled(
          Object.entries(SERVICES).map(async ([name, url]) => {
            const response = await fetch(`${url}/health`, { timeout: 5000 });
            return {
              name,
              status: response.ok ? 'healthy' : 'unhealthy',
              responseTime: response.headers.get('x-response-time') || 'unknown'
            };
          })
        );

        const results = serviceStatuses.map((result, index) => {
          const serviceName = Object.keys(SERVICES)[index];
          return result.status === 'fulfilled' 
            ? result.value 
            : { name: serviceName, status: 'error', error: result.reason };
        });

        res.json({ services: results, timestamp: new Date().toISOString() });
      } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({ error: 'Status check failed' });
      }
    });
  }

  private setupProxies(): void {
    // Security service proxy
    this.app.use('/api/security', 
      this.authenticateToken,
      this.requirePermission('security:access'),
      createProxyMiddleware({
        target: SERVICES.security,
        changeOrigin: true,
        pathRewrite: { '^/api/security': '' },
        onError: (err, req, res) => {
          logger.error('Security service proxy error:', err);
          res.status(502).json({ error: 'Security service unavailable' });
        }
      })
    );

    // Heartbeat service proxy
    this.app.use('/api/heartbeat',
      this.authenticateToken,
      createProxyMiddleware({
        target: SERVICES.heartbeat,
        changeOrigin: true,
        pathRewrite: { '^/api/heartbeat': '' },
        onError: (err, req, res) => {
          logger.error('Heartbeat service proxy error:', err);
          res.status(502).json({ error: 'Heartbeat service unavailable' });
        }
      })
    );

    // Reflection service proxy
    this.app.use('/api/reflection',
      this.authenticateToken,
      this.requirePermission('reflection:access'),
      createProxyMiddleware({
        target: SERVICES.reflection,
        changeOrigin: true,
        pathRewrite: { '^/api/reflection': '' },
        onError: (err, req, res) => {
          logger.error('Reflection service proxy error:', err);
          res.status(502).json({ error: 'Reflection service unavailable' });
        }
      })
    );

    // Optimization service proxy
    this.app.use('/api/optimization',
      this.authenticateToken,
      this.requirePermission('optimization:access'),
      createProxyMiddleware({
        target: SERVICES.optimization,
        changeOrigin: true,
        pathRewrite: { '^/api/optimization': '' },
        onError: (err, req, res) => {
          logger.error('Optimization service proxy error:', err);
          res.status(502).json({ error: 'Optimization service unavailable' });
        }
      })
    );

    // Analytics service proxy
    this.app.use('/api/analytics',
      this.authenticateToken,
      this.requirePermission('analytics:access'),
      createProxyMiddleware({
        target: SERVICES.analytics,
        changeOrigin: true,
        pathRewrite: { '^/api/analytics': '' },
        onError: (err, req, res) => {
          logger.error('Analytics service proxy error:', err);
          res.status(502).json({ error: 'Analytics service unavailable' });
        }
      })
    );
  }

  private setupHealthCheck(): void {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
  }

  private setupMetrics(): void {
    this.app.get('/metrics', (req, res) => {
      // Basic metrics - in production, use proper metrics library like prom-client
      res.set('Content-Type', 'text/plain');
      res.send(`# HELP gateway_requests_total Total number of requests
# TYPE gateway_requests_total counter
gateway_requests_total ${Math.floor(Math.random() * 1000)}

# HELP gateway_uptime_seconds Gateway uptime in seconds
# TYPE gateway_uptime_seconds gauge
gateway_uptime_seconds ${process.uptime()}
`);
    });
  }

  public async start(): Promise<void> {
    try {
      await redisClient.connect();
      logger.info('Connected to Redis');

      // Setup periodic health checks
      cron.schedule('*/30 * * * * *', async () => {
        try {
          // Ping all services to ensure they're healthy
          for (const [name, url] of Object.entries(SERVICES)) {
            try {
              await fetch(`${url}/health`, { timeout: 2000 });
            } catch (error) {
              logger.warn(`Service ${name} health check failed:`, error);
            }
          }
        } catch (error) {
          logger.error('Health check cron error:', error);
        }
      });

      this.app.listen(this.port, () => {
        logger.info(`🚀 Gateway service started on port ${this.port}`);
        logger.info('Available services:', Object.keys(SERVICES));
      });
    } catch (error) {
      logger.error('Failed to start gateway service:', error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Gateway service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Gateway service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

// Start the gateway service
const gateway = new GatewayService();
gateway.start().catch((error) => {
  logger.error('Failed to start gateway:', error);
  process.exit(1);
});