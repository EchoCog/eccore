import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import redis from 'redis';
import winston from 'winston';
import axios from 'axios';
import cron from 'node-cron';
import * as si from 'systeminformation';

// Health monitoring service inspired by the original heartbeat monitor
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'heartbeat.log' })
  ]
});

// Redis client for metrics storage
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

interface HeartbeatData {
  timestamp: Date;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    percentage: number;
    loadAverage: number[];
  };
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  networkStats: {
    bytesReceived: number;
    bytesSent: number;
  };
  processStats: {
    uptime: number;
    pid: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  serviceHealth: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      lastCheck: Date;
      errors: string[];
    };
  };
  isHealthy: boolean;
  alertLevel: 'none' | 'warning' | 'critical';
}

interface HeartbeatStatus {
  isRunning: boolean;
  isHealthy: boolean;
  lastHeartbeat: Date | null;
  totalHeartbeats: number;
  averageResponseTime: number;
  errorCount: number;
  alertsGenerated: number;
}

interface HealthThresholds {
  memory: { warning: number; critical: number };
  cpu: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  responseTime: { warning: number; critical: number };
}

class HeartbeatService {
  private app: express.Application;
  private port: number;
  private status: HeartbeatStatus;
  private responseTimes: number[] = [];
  private errors: string[] = [];
  private heartbeatHistory: HeartbeatData[] = [];
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  
  // Service endpoints to monitor
  private services = {
    security: process.env.SECURITY_SERVICE_URL || 'http://security:8081',
    reflection: process.env.REFLECTION_SERVICE_URL || 'http://reflection:8083',
    optimization: process.env.OPTIMIZATION_SERVICE_URL || 'http://optimization:8084',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:8085'
  };

  // Health thresholds
  private thresholds: HealthThresholds = {
    memory: { warning: 70, critical: 90 },
    cpu: { warning: 70, critical: 90 },
    disk: { warning: 80, critical: 95 },
    responseTime: { warning: 2000, critical: 5000 }
  };

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8082');
    this.status = {
      isRunning: false,
      isHealthy: true,
      lastHeartbeat: null,
      totalHeartbeats: 0,
      averageResponseTime: 0,
      errorCount: 0,
      alertsGenerated: 0
    };
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Heartbeat service request', {
        method: req.method,
        url: req.url,
        ip: req.ip
      });
      next();
    });
  }

  private async collectSystemMetrics(): Promise<Partial<HeartbeatData>> {
    try {
      const startTime = Date.now();
      
      // Get system information
      const [memory, cpu, disk, network] = await Promise.all([
        si.mem(),
        si.currentLoad(),
        si.fsSize(),
        si.networkStats()
      ]);

      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      
      // Keep only last 100 response times
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }

      // Calculate averages
      const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      this.status.averageResponseTime = avgResponseTime;

      // Get primary disk usage
      const primaryDisk = disk[0] || { used: 0, size: 1 };
      
      // Get network stats (sum of all interfaces)
      const networkTotals = network.reduce(
        (totals, iface) => ({
          bytesReceived: totals.bytesReceived + (iface.rx_bytes || 0),
          bytesSent: totals.bytesSent + (iface.tx_bytes || 0)
        }),
        { bytesReceived: 0, bytesSent: 0 }
      );

      return {
        timestamp: new Date(),
        memoryUsage: {
          used: memory.used,
          total: memory.total,
          percentage: (memory.used / memory.total) * 100
        },
        cpuUsage: {
          percentage: cpu.currentLoad,
          loadAverage: cpu.avgLoad ? [cpu.avgLoad] : [0]
        },
        diskUsage: {
          used: primaryDisk.used,
          total: primaryDisk.size,
          percentage: (primaryDisk.used / primaryDisk.size) * 100
        },
        networkStats: networkTotals,
        processStats: {
          uptime: process.uptime(),
          pid: process.pid,
          memoryUsage: process.memoryUsage()
        }
      };
    } catch (error) {
      logger.error('Error collecting system metrics:', error);
      this.errors.push(`System metrics error: ${error}`);
      this.status.errorCount++;
      return {
        timestamp: new Date(),
        memoryUsage: { used: 0, total: 1, percentage: 0 },
        cpuUsage: { percentage: 0, loadAverage: [0] },
        diskUsage: { used: 0, total: 1, percentage: 0 },
        networkStats: { bytesReceived: 0, bytesSent: 0 },
        processStats: {
          uptime: process.uptime(),
          pid: process.pid,
          memoryUsage: process.memoryUsage()
        }
      };
    }
  }

  private async checkServiceHealth(): Promise<{ [serviceName: string]: any }> {
    const serviceHealth: { [serviceName: string]: any } = {};

    await Promise.allSettled(
      Object.entries(this.services).map(async ([name, url]) => {
        try {
          const startTime = Date.now();
          const response = await axios.get(`${url}/health`, { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          serviceHealth[name] = {
            status: response.status === 200 ? 'healthy' : 'degraded',
            responseTime,
            lastCheck: new Date(),
            errors: []
          };
        } catch (error) {
          serviceHealth[name] = {
            status: 'unhealthy',
            responseTime: 0,
            lastCheck: new Date(),
            errors: [`Health check failed: ${error}`]
          };
          
          logger.warn(`Service ${name} health check failed:`, error);
        }
      })
    );

    return serviceHealth;
  }

  private determineHealthStatus(metrics: Partial<HeartbeatData>): { isHealthy: boolean; alertLevel: string; alerts: string[] } {
    const alerts: string[] = [];
    let alertLevel = 'none';
    let isHealthy = true;

    // Check memory usage
    if (metrics.memoryUsage) {
      if (metrics.memoryUsage.percentage > this.thresholds.memory.critical) {
        alerts.push(`Critical memory usage: ${metrics.memoryUsage.percentage.toFixed(1)}%`);
        alertLevel = 'critical';
        isHealthy = false;
      } else if (metrics.memoryUsage.percentage > this.thresholds.memory.warning) {
        alerts.push(`High memory usage: ${metrics.memoryUsage.percentage.toFixed(1)}%`);
        if (alertLevel === 'none') alertLevel = 'warning';
      }
    }

    // Check CPU usage
    if (metrics.cpuUsage) {
      if (metrics.cpuUsage.percentage > this.thresholds.cpu.critical) {
        alerts.push(`Critical CPU usage: ${metrics.cpuUsage.percentage.toFixed(1)}%`);
        alertLevel = 'critical';
        isHealthy = false;
      } else if (metrics.cpuUsage.percentage > this.thresholds.cpu.warning) {
        alerts.push(`High CPU usage: ${metrics.cpuUsage.percentage.toFixed(1)}%`);
        if (alertLevel === 'none') alertLevel = 'warning';
      }
    }

    // Check disk usage
    if (metrics.diskUsage) {
      if (metrics.diskUsage.percentage > this.thresholds.disk.critical) {
        alerts.push(`Critical disk usage: ${metrics.diskUsage.percentage.toFixed(1)}%`);
        alertLevel = 'critical';
        isHealthy = false;
      } else if (metrics.diskUsage.percentage > this.thresholds.disk.warning) {
        alerts.push(`High disk usage: ${metrics.diskUsage.percentage.toFixed(1)}%`);
        if (alertLevel === 'none') alertLevel = 'warning';
      }
    }

    // Check service health
    if (metrics.serviceHealth) {
      const unhealthyServices = Object.entries(metrics.serviceHealth)
        .filter(([_, health]) => health.status === 'unhealthy');
      
      if (unhealthyServices.length > 0) {
        alerts.push(`Unhealthy services: ${unhealthyServices.map(([name]) => name).join(', ')}`);
        alertLevel = 'critical';
        isHealthy = false;
      }
    }

    return { isHealthy, alertLevel, alerts };
  }

  private async performHeartbeat(): Promise<HeartbeatData> {
    try {
      const startTime = Date.now();
      
      // Collect system metrics and service health in parallel
      const [systemMetrics, serviceHealth] = await Promise.all([
        this.collectSystemMetrics(),
        this.checkServiceHealth()
      ]);

      const metrics = {
        ...systemMetrics,
        serviceHealth
      } as HeartbeatData;

      // Determine overall health status
      const { isHealthy, alertLevel, alerts } = this.determineHealthStatus(metrics);
      
      metrics.isHealthy = isHealthy;
      metrics.alertLevel = alertLevel as any;

      // Log alerts
      if (alerts.length > 0) {
        logger.warn('Health alerts generated:', alerts);
        this.status.alertsGenerated += alerts.length;
      }

      // Update status
      this.status.lastHeartbeat = new Date();
      this.status.totalHeartbeats++;
      this.status.isHealthy = isHealthy;

      // Store in history (keep last 100 heartbeats)
      this.heartbeatHistory.push(metrics);
      if (this.heartbeatHistory.length > 100) {
        this.heartbeatHistory.shift();
      }

      // Store in Redis for other services
      await redisClient.setEx(
        'heartbeat:latest',
        300, // 5 minutes TTL
        JSON.stringify(metrics)
      );

      logger.info('Heartbeat completed', {
        isHealthy,
        alertLevel,
        responseTime: Date.now() - startTime,
        alertCount: alerts.length
      });

      return metrics;
    } catch (error) {
      logger.error('Heartbeat error:', error);
      this.errors.push(`Heartbeat error: ${error}`);
      this.status.errorCount++;
      throw error;
    }
  }

  private setupRoutes(): void {
    // Current heartbeat data
    this.app.get('/heartbeat', async (req, res) => {
      try {
        const heartbeat = await this.performHeartbeat();
        res.json(heartbeat);
      } catch (error) {
        res.status(500).json({ error: 'Heartbeat failed' });
      }
    });

    // Heartbeat status
    this.app.get('/status', (req, res) => {
      res.json(this.status);
    });

    // Heartbeat history
    this.app.get('/history', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = this.heartbeatHistory.slice(-limit);
      res.json({ history, total: this.heartbeatHistory.length });
    });

    // System metrics only
    this.app.get('/metrics/system', async (req, res) => {
      try {
        const metrics = await this.collectSystemMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to collect system metrics' });
      }
    });

    // Service health only
    this.app.get('/metrics/services', async (req, res) => {
      try {
        const serviceHealth = await this.checkServiceHealth();
        res.json({ serviceHealth });
      } catch (error) {
        res.status(500).json({ error: 'Failed to check service health' });
      }
    });

    // Update thresholds
    this.app.post('/thresholds', (req, res) => {
      try {
        const newThresholds = req.body;
        this.thresholds = { ...this.thresholds, ...newThresholds };
        logger.info('Health thresholds updated:', this.thresholds);
        res.json({ thresholds: this.thresholds });
      } catch (error) {
        res.status(400).json({ error: 'Invalid thresholds' });
      }
    });

    // Start/stop monitoring
    this.app.post('/control/:action', (req, res) => {
      const { action } = req.params;
      
      try {
        if (action === 'start') {
          this.startMonitoring();
          res.json({ message: 'Monitoring started' });
        } else if (action === 'stop') {
          this.stopMonitoring();
          res.json({ message: 'Monitoring stopped' });
        } else {
          res.status(400).json({ error: 'Invalid action' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Control action failed' });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        monitoring: this.isRunning,
        lastHeartbeat: this.status.lastHeartbeat
      });
    });

    // Prometheus metrics
    this.app.get('/metrics', (req, res) => {
      const latest = this.heartbeatHistory[this.heartbeatHistory.length - 1];
      
      res.set('Content-Type', 'text/plain');
      res.send(`# HELP heartbeat_memory_usage_percent Memory usage percentage
# TYPE heartbeat_memory_usage_percent gauge
heartbeat_memory_usage_percent ${latest?.memoryUsage?.percentage || 0}

# HELP heartbeat_cpu_usage_percent CPU usage percentage
# TYPE heartbeat_cpu_usage_percent gauge
heartbeat_cpu_usage_percent ${latest?.cpuUsage?.percentage || 0}

# HELP heartbeat_disk_usage_percent Disk usage percentage
# TYPE heartbeat_disk_usage_percent gauge
heartbeat_disk_usage_percent ${latest?.diskUsage?.percentage || 0}

# HELP heartbeat_uptime_seconds Service uptime in seconds
# TYPE heartbeat_uptime_seconds gauge
heartbeat_uptime_seconds ${process.uptime()}

# HELP heartbeat_total_count Total heartbeats performed
# TYPE heartbeat_total_count counter
heartbeat_total_count ${this.status.totalHeartbeats}

# HELP heartbeat_error_count Total errors encountered
# TYPE heartbeat_error_count counter
heartbeat_error_count ${this.status.errorCount}
`);
    });
  }

  private startMonitoring(): void {
    if (this.isRunning) {
      logger.warn('Monitoring already running');
      return;
    }

    logger.info('Starting heartbeat monitoring...');
    this.isRunning = true;
    this.status.isRunning = true;

    // Perform heartbeat every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHeartbeat();
      } catch (error) {
        logger.error('Scheduled heartbeat failed:', error);
      }
    }, 30000);

    // Perform initial heartbeat
    this.performHeartbeat().catch(error => {
      logger.error('Initial heartbeat failed:', error);
    });

    logger.info('Heartbeat monitoring started');
  }

  private stopMonitoring(): void {
    if (!this.isRunning) {
      logger.warn('Monitoring not running');
      return;
    }

    logger.info('Stopping heartbeat monitoring...');
    this.isRunning = false;
    this.status.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    logger.info('Heartbeat monitoring stopped');
  }

  public async start(): Promise<void> {
    try {
      await redisClient.connect();
      logger.info('Connected to Redis');

      this.app.listen(this.port, () => {
        logger.info(`💓 Heartbeat service started on port ${this.port}`);
        this.startMonitoring();
      });
    } catch (error) {
      logger.error('Failed to start heartbeat service:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    this.stopMonitoring();
    await redisClient.quit();
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Heartbeat service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Heartbeat service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

// Start the heartbeat service
const heartbeatService = new HeartbeatService();
heartbeatService.start().catch((error) => {
  logger.error('Failed to start heartbeat service:', error);
  process.exit(1);
});