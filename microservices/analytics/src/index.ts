import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

class AnalyticsService {
  private app: express.Application;
  private port: number;
  private metrics: any[] = [];

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8085');
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        metricsCount: this.metrics.length
      });
    });

    this.app.post('/metrics', (req, res) => {
      const metric = {
        ...req.body,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };
      
      this.metrics.push(metric);
      logger.info('Metric received', { type: metric.type });
      
      res.json({ status: 'recorded', id: metric.id });
    });

    this.app.get('/analytics', (req, res) => {
      const summary = {
        totalMetrics: this.metrics.length,
        recentMetrics: this.metrics.slice(-10),
        summary: {
          performance: this.metrics.filter(m => m.type === 'performance').length,
          health: this.metrics.filter(m => m.type === 'health').length,
          security: this.metrics.filter(m => m.type === 'security').length
        }
      };
      
      res.json(summary);
    });

    this.app.get('/metrics', (req, res) => {
      res.set('Content-Type', 'text/plain');
      res.send(`# HELP analytics_metrics_total Total metrics collected
# TYPE analytics_metrics_total counter
analytics_metrics_total ${this.metrics.length}
`);
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`📊 Analytics service started on port ${this.port}`);
    });
  }
}

const service = new AnalyticsService();
service.start();