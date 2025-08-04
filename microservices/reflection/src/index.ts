import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import redis from 'redis';
import winston from 'winston';
import axios from 'axios';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

// Meta-cognitive reflection service based on the original reflection engine
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'reflection.log' })
  ]
});

// Redis client for state management
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

interface ReflectionInsight {
  id: string;
  type: 'performance' | 'pattern' | 'behavior' | 'optimization' | 'error';
  content: string;
  confidence: number;
  timestamp: Date;
  source: string;
  metadata: {
    depth: number;
    category: string;
    tags: string[];
  };
}

interface ReflectionCycle {
  id: string;
  startTime: Date;
  endTime?: Date;
  depth: number;
  status: 'running' | 'completed' | 'failed';
  insights: ReflectionInsight[];
  improvements: Improvement[];
  patterns: PatternRecognition[];
  context: ReflectionContext;
  metrics: {
    processingTime: number;
    insightsGenerated: number;
    patternsFound: number;
    improvementsIdentified: number;
  };
}

interface Improvement {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  estimatedImpact: number;
  feasibility: number;
  implementation: {
    steps: string[];
    dependencies: string[];
    estimatedTime: number;
  };
  status: 'identified' | 'planned' | 'implementing' | 'completed' | 'rejected';
  timestamp: Date;
}

interface PatternRecognition {
  id: string;
  pattern: string;
  frequency: number;
  confidence: number;
  category: string;
  occurrences: Date[];
  relatedInsights: string[];
  significance: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface ReflectionContext {
  systemState: {
    memory: number;
    cpu: number;
    services: { [key: string]: string };
  };
  recentEvents: string[];
  userInteractions: number;
  performanceMetrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  environmentData: any;
}

interface MetaCognitiveState {
  currentDepth: number;
  maxDepth: number;
  activeReflections: string[];
  totalCycles: number;
  insightHistory: ReflectionInsight[];
  patternDatabase: PatternRecognition[];
  improvementQueue: Improvement[];
  learningRate: number;
  confidenceThreshold: number;
}

class ReflectionService {
  private app: express.Application;
  private port: number;
  private state: MetaCognitiveState;
  private activeCycles: Map<string, ReflectionCycle> = new Map();
  private isRunning = false;
  private reflectionInterval?: NodeJS.Timeout;

  // Configuration
  private config = {
    reflectionCycleInterval: parseInt(process.env.REFLECTION_INTERVAL || '60000'), // 1 minute
    maxReflectionDepth: parseInt(process.env.MAX_REFLECTION_DEPTH || '5'),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
    learningRate: parseFloat(process.env.LEARNING_RATE || '0.1'),
    maxInsightHistory: parseInt(process.env.MAX_INSIGHT_HISTORY || '1000'),
    enableMetaCognition: process.env.ENABLE_META_COGNITION !== 'false'
  };

  // External services for context gathering
  private services = {
    security: process.env.SECURITY_SERVICE_URL || 'http://security:8081',
    heartbeat: process.env.HEARTBEAT_SERVICE_URL || 'http://heartbeat:8082',
    optimization: process.env.OPTIMIZATION_SERVICE_URL || 'http://optimization:8084',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:8085'
  };

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8083');
    this.state = {
      currentDepth: 0,
      maxDepth: this.config.maxReflectionDepth,
      activeReflections: [],
      totalCycles: 0,
      insightHistory: [],
      patternDatabase: [],
      improvementQueue: [],
      learningRate: this.config.learningRate,
      confidenceThreshold: this.config.confidenceThreshold
    };
    this.setupMiddleware();
    this.setupRoutes();
    this.loadStateFromRedis();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Reflection service request', {
        method: req.method,
        url: req.url,
        ip: req.ip
      });
      next();
    });
  }

  private async loadStateFromRedis(): Promise<void> {
    try {
      const savedState = await redisClient.get('reflection:state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.state = { ...this.state, ...parsedState };
        logger.info('Reflection state loaded from Redis');
      }
    } catch (error) {
      logger.error('Failed to load state from Redis:', error);
    }
  }

  private async saveStateToRedis(): Promise<void> {
    try {
      await redisClient.setEx('reflection:state', 3600, JSON.stringify(this.state));
    } catch (error) {
      logger.error('Failed to save state to Redis:', error);
    }
  }

  private async gatherReflectionContext(): Promise<ReflectionContext> {
    const context: ReflectionContext = {
      systemState: {
        memory: 0,
        cpu: 0,
        services: {}
      },
      recentEvents: [],
      userInteractions: 0,
      performanceMetrics: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0
      },
      environmentData: {}
    };

    try {
      // Gather system metrics from heartbeat service
      const heartbeatResponse = await axios.get(`${this.services.heartbeat}/heartbeat`, { timeout: 5000 });
      const heartbeatData = heartbeatResponse.data;
      
      context.systemState = {
        memory: heartbeatData.memoryUsage?.percentage || 0,
        cpu: heartbeatData.cpuUsage?.percentage || 0,
        services: heartbeatData.serviceHealth || {}
      };

      context.performanceMetrics = {
        responseTime: heartbeatData.averageResponseTime || 0,
        throughput: heartbeatData.totalHeartbeats || 0,
        errorRate: heartbeatData.errorCount || 0
      };

      // Gather recent events from Redis
      const recentEvents = await redisClient.lRange('system:events', 0, 10);
      context.recentEvents = recentEvents;

      // Get user interaction count
      const userInteractions = await redisClient.get('analytics:user_interactions');
      context.userInteractions = parseInt(userInteractions || '0');

    } catch (error) {
      logger.warn('Failed to gather complete reflection context:', error);
    }

    return context;
  }

  private generateInsights(context: ReflectionContext, depth: number): ReflectionInsight[] {
    const insights: ReflectionInsight[] = [];

    // System performance insights
    if (context.systemState.memory > 80) {
      insights.push({
        id: uuidv4(),
        type: 'performance',
        content: `High memory usage detected (${context.systemState.memory.toFixed(1)}%). Consider memory optimization strategies.`,
        confidence: 0.9,
        timestamp: new Date(),
        source: 'memory_analyzer',
        metadata: {
          depth,
          category: 'resource_management',
          tags: ['memory', 'optimization', 'performance']
        }
      });
    }

    if (context.systemState.cpu > 80) {
      insights.push({
        id: uuidv4(),
        type: 'performance',
        content: `High CPU usage detected (${context.systemState.cpu.toFixed(1)}%). Consider load balancing or optimization.`,
        confidence: 0.9,
        timestamp: new Date(),
        source: 'cpu_analyzer',
        metadata: {
          depth,
          category: 'resource_management',
          tags: ['cpu', 'optimization', 'performance']
        }
      });
    }

    // Service health insights
    const unhealthyServices = Object.entries(context.systemState.services)
      .filter(([_, status]) => (status as any)?.status === 'unhealthy');
    
    if (unhealthyServices.length > 0) {
      insights.push({
        id: uuidv4(),
        type: 'error',
        content: `Unhealthy services detected: ${unhealthyServices.map(([name]) => name).join(', ')}. Immediate attention required.`,
        confidence: 0.95,
        timestamp: new Date(),
        source: 'service_monitor',
        metadata: {
          depth,
          category: 'service_health',
          tags: ['health', 'services', 'critical']
        }
      });
    }

    // Performance metrics insights
    if (context.performanceMetrics.responseTime > 2000) {
      insights.push({
        id: uuidv4(),
        type: 'performance',
        content: `Response time degradation detected (${context.performanceMetrics.responseTime}ms). Consider caching or optimization.`,
        confidence: 0.8,
        timestamp: new Date(),
        source: 'performance_analyzer',
        metadata: {
          depth,
          category: 'response_time',
          tags: ['latency', 'optimization', 'user_experience']
        }
      });
    }

    // Pattern-based insights
    const recentPatterns = this.detectPatterns(context);
    recentPatterns.forEach(pattern => {
      if (pattern.significance === 'high') {
        insights.push({
          id: uuidv4(),
          type: 'pattern',
          content: `Significant pattern detected: ${pattern.pattern}. Frequency: ${pattern.frequency}`,
          confidence: pattern.confidence,
          timestamp: new Date(),
          source: 'pattern_recognizer',
          metadata: {
            depth,
            category: 'behavioral_analysis',
            tags: ['pattern', 'behavior', 'trend']
          }
        });
      }
    });

    // Meta-cognitive insights (recursive reflection)
    if (depth < this.config.maxReflectionDepth && this.config.enableMetaCognition) {
      insights.push({
        id: uuidv4(),
        type: 'behavior',
        content: `Meta-reflection at depth ${depth}: System demonstrating ${insights.length} primary insights. Recursive analysis suggests focus on top-priority items.`,
        confidence: 0.7,
        timestamp: new Date(),
        source: 'meta_cognitive_engine',
        metadata: {
          depth,
          category: 'meta_cognition',
          tags: ['reflection', 'meta', 'priority']
        }
      });
    }

    return insights;
  }

  private detectPatterns(context: ReflectionContext): PatternRecognition[] {
    const patterns: PatternRecognition[] = [];

    // Memory usage pattern
    if (context.systemState.memory > 70) {
      const memoryPattern = this.state.patternDatabase.find(p => p.pattern === 'high_memory_usage');
      if (memoryPattern) {
        memoryPattern.frequency++;
        memoryPattern.occurrences.push(new Date());
        memoryPattern.confidence = Math.min(memoryPattern.confidence + 0.1, 1.0);
      } else {
        patterns.push({
          id: uuidv4(),
          pattern: 'high_memory_usage',
          frequency: 1,
          confidence: 0.6,
          category: 'resource_utilization',
          occurrences: [new Date()],
          relatedInsights: [],
          significance: 'medium',
          timestamp: new Date()
        });
      }
    }

    // Error rate pattern
    if (context.performanceMetrics.errorRate > 5) {
      patterns.push({
        id: uuidv4(),
        pattern: 'elevated_error_rate',
        frequency: 1,
        confidence: 0.8,
        category: 'error_behavior',
        occurrences: [new Date()],
        relatedInsights: [],
        significance: 'high',
        timestamp: new Date()
      });
    }

    return patterns;
  }

  private generateImprovements(insights: ReflectionInsight[]): Improvement[] {
    const improvements: Improvement[] = [];

    insights.forEach(insight => {
      switch (insight.type) {
        case 'performance':
          if (insight.content.includes('memory')) {
            improvements.push({
              id: uuidv4(),
              title: 'Implement Memory Optimization',
              description: 'Deploy memory optimization strategies to reduce usage',
              priority: 'high',
              category: 'performance',
              estimatedImpact: 0.8,
              feasibility: 0.7,
              implementation: {
                steps: [
                  'Analyze memory usage patterns',
                  'Implement garbage collection optimization',
                  'Add memory caching strategies',
                  'Monitor memory usage reduction'
                ],
                dependencies: ['optimization_service'],
                estimatedTime: 240 // minutes
              },
              status: 'identified',
              timestamp: new Date()
            });
          }
          break;

        case 'error':
          if (insight.content.includes('services')) {
            improvements.push({
              id: uuidv4(),
              title: 'Service Health Recovery',
              description: 'Implement automated service recovery mechanisms',
              priority: 'critical',
              category: 'reliability',
              estimatedImpact: 0.9,
              feasibility: 0.8,
              implementation: {
                steps: [
                  'Identify failing services',
                  'Implement health check automation',
                  'Deploy service restart mechanisms',
                  'Add monitoring alerts'
                ],
                dependencies: ['heartbeat_service', 'security_service'],
                estimatedTime: 180 // minutes
              },
              status: 'identified',
              timestamp: new Date()
            });
          }
          break;
      }
    });

    return improvements;
  }

  private async performReflectionCycle(depth: number = 0): Promise<ReflectionCycle> {
    const cycleId = uuidv4();
    const cycle: ReflectionCycle = {
      id: cycleId,
      startTime: new Date(),
      depth,
      status: 'running',
      insights: [],
      improvements: [],
      patterns: [],
      context: await this.gatherReflectionContext(),
      metrics: {
        processingTime: 0,
        insightsGenerated: 0,
        patternsFound: 0,
        improvementsIdentified: 0
      }
    };

    try {
      this.activeCycles.set(cycleId, cycle);
      this.state.activeReflections.push(cycleId);
      this.state.currentDepth = depth;

      logger.info(`Starting reflection cycle at depth ${depth}`, { cycleId });

      // Generate insights
      cycle.insights = this.generateInsights(cycle.context, depth);
      cycle.metrics.insightsGenerated = cycle.insights.length;

      // Detect patterns
      cycle.patterns = this.detectPatterns(cycle.context);
      cycle.metrics.patternsFound = cycle.patterns.length;

      // Generate improvements
      cycle.improvements = this.generateImprovements(cycle.insights);
      cycle.metrics.improvementsIdentified = cycle.improvements.length;

      // Update state
      this.state.insightHistory.push(...cycle.insights);
      this.state.patternDatabase.push(...cycle.patterns);
      this.state.improvementQueue.push(...cycle.improvements);

      // Trim history if too large
      if (this.state.insightHistory.length > this.config.maxInsightHistory) {
        this.state.insightHistory = this.state.insightHistory.slice(-this.config.maxInsightHistory);
      }

      // Complete cycle
      cycle.endTime = new Date();
      cycle.status = 'completed';
      cycle.metrics.processingTime = cycle.endTime.getTime() - cycle.startTime.getTime();

      this.state.totalCycles++;
      this.state.activeReflections = this.state.activeReflections.filter(id => id !== cycleId);

      logger.info(`Reflection cycle completed`, {
        cycleId,
        depth,
        insights: cycle.metrics.insightsGenerated,
        patterns: cycle.metrics.patternsFound,
        improvements: cycle.metrics.improvementsIdentified,
        processingTime: cycle.metrics.processingTime
      });

      // Save state
      await this.saveStateToRedis();

      // Store cycle in Redis
      await redisClient.setEx(
        `reflection:cycle:${cycleId}`,
        3600,
        JSON.stringify(cycle)
      );

      return cycle;
    } catch (error) {
      logger.error(`Reflection cycle failed`, { cycleId, depth, error });
      cycle.status = 'failed';
      cycle.endTime = new Date();
      this.state.activeReflections = this.state.activeReflections.filter(id => id !== cycleId);
      throw error;
    }
  }

  private setupRoutes(): void {
    // Trigger manual reflection cycle
    this.app.post('/reflect', async (req, res) => {
      try {
        const { depth = 0 } = req.body;
        const cycle = await this.performReflectionCycle(depth);
        res.json(cycle);
      } catch (error) {
        logger.error('Manual reflection failed:', error);
        res.status(500).json({ error: 'Reflection cycle failed' });
      }
    });

    // Get reflection state
    this.app.get('/state', (req, res) => {
      res.json(this.state);
    });

    // Get recent insights
    this.app.get('/insights', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 10;
      const insights = this.state.insightHistory.slice(-limit);
      res.json({ insights, total: this.state.insightHistory.length });
    });

    // Get pattern database
    this.app.get('/patterns', (req, res) => {
      res.json({ patterns: this.state.patternDatabase });
    });

    // Get improvement queue
    this.app.get('/improvements', (req, res) => {
      res.json({ improvements: this.state.improvementQueue });
    });

    // Get active cycles
    this.app.get('/cycles/active', (req, res) => {
      const activeCycles = Array.from(this.activeCycles.values());
      res.json({ cycles: activeCycles });
    });

    // Get cycle history
    this.app.get('/cycles/history', async (req, res) => {
      try {
        const keys = await redisClient.keys('reflection:cycle:*');
        const cycles = await Promise.all(
          keys.map(async key => {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
          })
        );
        res.json({ cycles: cycles.filter(c => c) });
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cycle history' });
      }
    });

    // Update configuration
    this.app.post('/config', (req, res) => {
      try {
        const newConfig = req.body;
        this.config = { ...this.config, ...newConfig };
        logger.info('Reflection configuration updated:', this.config);
        res.json({ config: this.config });
      } catch (error) {
        res.status(400).json({ error: 'Invalid configuration' });
      }
    });

    // Start/stop reflection service
    this.app.post('/control/:action', (req, res) => {
      const { action } = req.params;
      
      try {
        if (action === 'start') {
          this.startReflectionCycles();
          res.json({ message: 'Reflection cycles started' });
        } else if (action === 'stop') {
          this.stopReflectionCycles();
          res.json({ message: 'Reflection cycles stopped' });
        } else {
          res.status(400).json({ error: 'Invalid action' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Control action failed' });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        isRunning: this.isRunning,
        totalCycles: this.state.totalCycles,
        activeCycles: this.activeCycles.size
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(`# HELP reflection_total_cycles Total reflection cycles performed
# TYPE reflection_total_cycles counter
reflection_total_cycles ${this.state.totalCycles}

# HELP reflection_insights_total Total insights generated
# TYPE reflection_insights_total counter
reflection_insights_total ${this.state.insightHistory.length}

# HELP reflection_patterns_total Total patterns recognized
# TYPE reflection_patterns_total counter
reflection_patterns_total ${this.state.patternDatabase.length}

# HELP reflection_improvements_total Total improvements identified
# TYPE reflection_improvements_total counter
reflection_improvements_total ${this.state.improvementQueue.length}

# HELP reflection_active_cycles Currently active reflection cycles
# TYPE reflection_active_cycles gauge
reflection_active_cycles ${this.activeCycles.size}

# HELP reflection_uptime_seconds Service uptime
# TYPE reflection_uptime_seconds gauge
reflection_uptime_seconds ${process.uptime()}
`);
    });
  }

  private startReflectionCycles(): void {
    if (this.isRunning) {
      logger.warn('Reflection cycles already running');
      return;
    }

    logger.info('Starting reflection cycles...');
    this.isRunning = true;

    // Perform reflection cycles at configured intervals
    this.reflectionInterval = setInterval(async () => {
      try {
        await this.performReflectionCycle(0);
      } catch (error) {
        logger.error('Scheduled reflection cycle failed:', error);
      }
    }, this.config.reflectionCycleInterval);

    // Perform initial reflection
    this.performReflectionCycle(0).catch(error => {
      logger.error('Initial reflection cycle failed:', error);
    });

    logger.info('Reflection cycles started');
  }

  private stopReflectionCycles(): void {
    if (!this.isRunning) {
      logger.warn('Reflection cycles not running');
      return;
    }

    logger.info('Stopping reflection cycles...');
    this.isRunning = false;

    if (this.reflectionInterval) {
      clearInterval(this.reflectionInterval);
      this.reflectionInterval = undefined;
    }

    logger.info('Reflection cycles stopped');
  }

  public async start(): Promise<void> {
    try {
      await redisClient.connect();
      logger.info('Connected to Redis');

      this.app.listen(this.port, () => {
        logger.info(`🧠 Reflection service started on port ${this.port}`);
        this.startReflectionCycles();
      });
    } catch (error) {
      logger.error('Failed to start reflection service:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    this.stopReflectionCycles();
    await this.saveStateToRedis();
    await redisClient.quit();
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Reflection service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Reflection service shutting down...');
  await redisClient.quit();
  process.exit(0);
});

// Start the reflection service
const reflectionService = new ReflectionService();
reflectionService.start().catch((error) => {
  logger.error('Failed to start reflection service:', error);
  process.exit(1);
});