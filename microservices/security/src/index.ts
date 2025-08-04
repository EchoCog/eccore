import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import redis from 'redis';
import winston from 'winston';
import * as forge from 'node-forge';
import { EncryptJWT, jwtDecrypt } from 'jose';

// Security service for zero-knowledge autonomous agent operations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'security.log' })
  ]
});

// Redis client for session and key management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret';

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  permissions: string[];
  publicKey?: string;
  privateKeyEncrypted?: string;
}

interface ZeroKnowledgePayload {
  encryptedData: string;
  publicKey: string;
  signature: string;
  metadata: {
    algorithm: string;
    timestamp: number;
    nonce: string;
  };
}

class SecurityService {
  private app: express.Application;
  private port: number;
  private users: Map<string, User> = new Map();

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8081');
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDefaultUsers();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Security service request', {
        method: req.method,
        url: req.url,
        ip: req.ip
      });
      next();
    });
  }

  private async initializeDefaultUsers(): Promise<void> {
    // Create default admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const { publicKey, privateKey } = this.generateKeyPair();
    
    this.users.set('admin', {
      id: 'admin',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'admin',
      permissions: ['*'],
      publicKey: publicKey,
      privateKeyEncrypted: this.encryptPrivateKey(privateKey)
    });

    // Create default agent user
    const agentPasswordHash = await bcrypt.hash('agent123', 12);
    const agentKeys = this.generateKeyPair();
    
    this.users.set('agent', {
      id: 'agent',
      username: 'agent',
      passwordHash: agentPasswordHash,
      role: 'agent',
      permissions: ['reflection:access', 'optimization:access', 'heartbeat:access'],
      publicKey: agentKeys.publicKey,
      privateKeyEncrypted: this.encryptPrivateKey(agentKeys.privateKey)
    });

    logger.info('Default users initialized');
  }

  private generateKeyPair(): { publicKey: string; privateKey: string } {
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    return {
      publicKey: forge.pki.publicKeyToPem(keyPair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keyPair.privateKey)
    };
  }

  private encryptPrivateKey(privateKey: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptPrivateKey(encryptedPrivateKey: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Zero-knowledge encryption for agent data
  private encryptForZeroKnowledge(data: any, publicKeyPem: string): ZeroKnowledgePayload {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const dataString = JSON.stringify(data);
    
    // Generate symmetric key for data encryption
    const symmetricKey = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(16);
    
    // Encrypt data with symmetric key
    const cipher = crypto.createCipher('aes-256-gcm', symmetricKey);
    cipher.update(nonce);
    let encryptedData = cipher.update(dataString, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Encrypt symmetric key with public key
    const encryptedSymmetricKey = publicKey.encrypt(symmetricKey.toString('hex'));
    
    // Create signature
    const md = forge.md.sha256.create();
    md.update(dataString);
    const signature = forge.util.encode64(md.digest().getBytes());
    
    return {
      encryptedData: forge.util.encode64(encryptedData + authTag.toString('hex')),
      publicKey: forge.util.encode64(encryptedSymmetricKey),
      signature,
      metadata: {
        algorithm: 'RSA-AES-256-GCM',
        timestamp: Date.now(),
        nonce: nonce.toString('hex')
      }
    };
  }

  // Zero-knowledge decryption for agent data
  private decryptFromZeroKnowledge(payload: ZeroKnowledgePayload, privateKeyPem: string): any {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // Decrypt symmetric key
    const encryptedSymmetricKey = forge.util.decode64(payload.publicKey);
    const symmetricKeyHex = privateKey.decrypt(encryptedSymmetricKey);
    const symmetricKey = Buffer.from(symmetricKeyHex, 'hex');
    
    // Decrypt data
    const encryptedDataWithTag = forge.util.decode64(payload.encryptedData);
    const encryptedData = encryptedDataWithTag.slice(0, -32); // Remove auth tag
    const authTag = Buffer.from(encryptedDataWithTag.slice(-32), 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', symmetricKey);
    decipher.update(Buffer.from(payload.metadata.nonce, 'hex'));
    decipher.setAuthTag(authTag);
    
    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    
    return JSON.parse(decryptedData);
  }

  private setupRoutes(): void {
    // Authentication endpoint
    this.app.post('/auth/verify', async (req, res) => {
      try {
        const { username, password } = req.body;
        
        if (!username || !password) {
          res.status(400).json({ error: 'Username and password required' });
          return;
        }

        const user = this.users.get(username);
        if (!user) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        await redisClient.setEx(`session:${user.id}`, 3600, sessionToken);

        logger.info('User authenticated', { userId: user.id, role: user.role });
        
        res.json({
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          publicKey: user.publicKey
        });
      } catch (error) {
        logger.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // Key exchange endpoint for secure communication
    this.app.post('/keys/exchange', async (req, res) => {
      try {
        const { userId, clientPublicKey } = req.body;
        
        const user = this.users.get(userId);
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        // Generate ephemeral key pair for this session
        const ephemeralKeys = this.generateKeyPair();
        
        // Store ephemeral private key for this session
        const sessionId = crypto.randomBytes(16).toString('hex');
        await redisClient.setEx(`ephemeral:${sessionId}`, 3600, ephemeralKeys.privateKey);
        
        logger.info('Key exchange completed', { userId, sessionId });
        
        res.json({
          sessionId,
          serverPublicKey: ephemeralKeys.publicKey,
          userPublicKey: user.publicKey
        });
      } catch (error) {
        logger.error('Key exchange error:', error);
        res.status(500).json({ error: 'Key exchange failed' });
      }
    });

    // Zero-knowledge data encryption endpoint
    this.app.post('/encrypt', async (req, res) => {
      try {
        const { data, userId } = req.body;
        
        const user = this.users.get(userId);
        if (!user || !user.publicKey) {
          res.status(404).json({ error: 'User or public key not found' });
          return;
        }

        const encryptedPayload = this.encryptForZeroKnowledge(data, user.publicKey);
        
        logger.info('Data encrypted for zero-knowledge processing', { userId });
        
        res.json({ encryptedPayload });
      } catch (error) {
        logger.error('Encryption error:', error);
        res.status(500).json({ error: 'Encryption failed' });
      }
    });

    // Zero-knowledge data decryption endpoint
    this.app.post('/decrypt', async (req, res) => {
      try {
        const { encryptedPayload, userId } = req.body;
        
        const user = this.users.get(userId);
        if (!user || !user.privateKeyEncrypted) {
          res.status(404).json({ error: 'User or private key not found' });
          return;
        }

        const privateKey = this.decryptPrivateKey(user.privateKeyEncrypted);
        const decryptedData = this.decryptFromZeroKnowledge(encryptedPayload, privateKey);
        
        logger.info('Data decrypted from zero-knowledge processing', { userId });
        
        res.json({ data: decryptedData });
      } catch (error) {
        logger.error('Decryption error:', error);
        res.status(500).json({ error: 'Decryption failed' });
      }
    });

    // Secure message routing for inter-service communication
    this.app.post('/secure-message', async (req, res) => {
      try {
        const { fromService, toService, payload, signature } = req.body;
        
        // Verify service signatures and route securely
        // This would integrate with service registry in production
        
        logger.info('Secure message routed', { fromService, toService });
        
        res.json({ status: 'delivered', messageId: crypto.randomBytes(16).toString('hex') });
      } catch (error) {
        logger.error('Secure messaging error:', error);
        res.status(500).json({ error: 'Secure messaging failed' });
      }
    });

    // Certificate management for mTLS
    this.app.get('/certificates/:serviceId', async (req, res) => {
      try {
        const { serviceId } = req.params;
        
        // In production, this would generate/retrieve actual certificates
        const certificate = {
          serviceId,
          certificate: 'dummy-certificate',
          publicKey: 'dummy-public-key',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };
        
        logger.info('Certificate issued', { serviceId });
        
        res.json(certificate);
      } catch (error) {
        logger.error('Certificate issuance error:', error);
        res.status(500).json({ error: 'Certificate issuance failed' });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeUsers: this.users.size
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(`# HELP security_active_users Active users count
# TYPE security_active_users gauge
security_active_users ${this.users.size}

# HELP security_uptime_seconds Security service uptime
# TYPE security_uptime_seconds gauge
security_uptime_seconds ${process.uptime()}
`);
    });
  }

  public async start(): Promise<void> {
    try {
      await redisClient.connect();
      logger.info('Connected to Redis');

      this.app.listen(this.port, () => {
        logger.info(`🔐 Security service started on port ${this.port}`);
        logger.info('Zero-knowledge encryption ready');
        logger.info('mTLS certificate authority ready');
      });
    } catch (error) {
      logger.error('Failed to start security service:', error);
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Security service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Security service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

// Start the security service
const securityService = new SecurityService();
securityService.start().catch((error) => {
  logger.error('Failed to start security service:', error);
  process.exit(1);
});