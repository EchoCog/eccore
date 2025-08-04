/**
 * DeepTreeEcho Heartbeat Monitor
 * 
 * Monitors system health and performance metrics, providing real-time
 * feedback on the autonomy system's operational status.
 */

import { AutonomyConfig } from '../config';
import { BrowserEventEmitter } from '../utils/event-emitter';

export interface HeartbeatData {
  timestamp: Date;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  isHealthy: boolean;
  errors: string[];
}

export interface HeartbeatStatus {
  isRunning: boolean;
  isHealthy: boolean;
  lastHeartbeat: Date | null;
  totalHeartbeats: number;
  averageResponseTime: number;
  errorCount: number;
}

/**
 * Heartbeat Monitor Class
 * Continuously monitors system health and performance
 */
export class HeartbeatMonitor extends BrowserEventEmitter {
  private config: AutonomyConfig;
  private isRunning = false;
  private interval?: number; // Use number for browser setTimeout/setInterval
  private status: HeartbeatStatus;
  private responseTimes: number[] = [];
  private errors: string[] = [];

  constructor(config: AutonomyConfig) {
    super();
    this.config = config;
    this.status = {
      isRunning: false,
      isHealthy: true,
      lastHeartbeat: null,
      totalHeartbeats: 0,
      averageResponseTime: 0,
      errorCount: 0
    };
  }

  /**
   * Initialize the heartbeat monitor
   */
  async initialize(): Promise<void> {
    console.log('💓 Initializing Heartbeat Monitor...');
    
    // Validate configuration
    const validation = this.config.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid heartbeat configuration: ${validation.errors.join(', ')}`);
    }

    console.log('✅ Heartbeat Monitor initialized successfully');
  }

  /**
   * Start the heartbeat monitor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('💓 Starting Heartbeat Monitor...');
    
    const interval = this.config.get('heartbeatInterval');
    this.interval = setInterval(() => {
      this.performHeartbeat();
    }, interval) as any; // Cast to any for browser compatibility

    this.isRunning = true;
    this.status.isRunning = true;
    
    console.log('✅ Heartbeat Monitor started successfully');
  }

  /**
   * Stop the heartbeat monitor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('💓 Stopping Heartbeat Monitor...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    this.isRunning = false;
    this.status.isRunning = false;
    
    console.log('✅ Heartbeat Monitor stopped successfully');
  }

  /**
   * Get the current status
   */
  getStatus(): HeartbeatStatus {
    return { ...this.status };
  }

  /**
   * Perform a heartbeat check
   */
  private async performHeartbeat(): Promise<void> {
    const startTime = Date.now();
    const heartbeatData: HeartbeatData = {
      timestamp: new Date(),
      memoryUsage: 0,
      cpuUsage: 0,
      responseTime: 0,
      isHealthy: true,
      errors: []
    };

    try {
      // Measure memory usage
      heartbeatData.memoryUsage = this.measureMemoryUsage();
      
      // Measure CPU usage
      heartbeatData.cpuUsage = await this.measureCpuUsage();
      
      // Measure response time
      heartbeatData.responseTime = Date.now() - startTime;
      
      // Check if metrics are within acceptable ranges
      const maxMemory = this.config.get('maxMemoryUsage') || 1024 * 1024 * 1024; // Default 1GB
      const maxCpu = this.config.get('maxCpuUsage') || 80; // Default 80%
      const maxResponseTime = this.config.get('maxResponseTime') || 5000; // Default 5 seconds

      if (heartbeatData.memoryUsage > maxMemory) {
        heartbeatData.isHealthy = false;
        heartbeatData.errors.push(`Memory usage (${heartbeatData.memoryUsage}) exceeds limit (${maxMemory})`);
      }

      if (heartbeatData.cpuUsage > maxCpu) {
        heartbeatData.isHealthy = false;
        heartbeatData.errors.push(`CPU usage (${heartbeatData.cpuUsage}%) exceeds limit (${maxCpu}%)`);
      }

      if (heartbeatData.responseTime > maxResponseTime) {
        heartbeatData.isHealthy = false;
        heartbeatData.errors.push(`Response time (${heartbeatData.responseTime}ms) exceeds limit (${maxResponseTime}ms)`);
      }

      // Update status
      this.status.lastHeartbeat = heartbeatData.timestamp;
      this.status.totalHeartbeats++;
      this.status.isHealthy = heartbeatData.isHealthy;
      
      // Update response time average
      this.responseTimes.push(heartbeatData.responseTime);
      if (this.responseTimes.length > 10) {
        this.responseTimes.shift();
      }
      this.status.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

      // Emit heartbeat event
      this.emit('heartbeat', heartbeatData);

      // Log status
      if (heartbeatData.isHealthy) {
        console.log(`💓 Heartbeat: Memory=${heartbeatData.memoryUsage}MB, CPU=${heartbeatData.cpuUsage}%, Response=${heartbeatData.responseTime}ms`);
      } else {
        console.warn(`⚠️ Unhealthy heartbeat: ${heartbeatData.errors.join(', ')}`);
        this.status.errorCount++;
      }

    } catch (error) {
      console.error('❌ Heartbeat check failed:', error);
      heartbeatData.isHealthy = false;
      heartbeatData.errors.push(`Heartbeat check failed: ${error}`);
      this.status.errorCount++;
      this.emit('heartbeat', heartbeatData);
    }
  }

  /**
   * Measure current memory usage
   */
  private measureMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024); // Convert to MB
    }
    
    // Fallback for browser environment
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
    
    return 0;
  }

  /**
   * Measure current CPU usage
   */
  private async measureCpuUsage(): Promise<number> {
    // Simple CPU measurement using performance.now()
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 10));
    const end = performance.now();
    
    // Calculate approximate CPU usage based on timing
    const duration = end - start;
    const expectedDuration = 10; // Expected duration for 10ms timeout
    const cpuUsage = Math.min(100, Math.max(0, ((duration - expectedDuration) / expectedDuration) * 100));
    
    return Math.round(cpuUsage);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      memoryUsage: this.measureMemoryUsage(),
      cpuUsage: this.status.averageResponseTime > 100 ? 80 : 20, // Simplified estimation
      responseTime: this.status.averageResponseTime,
      errorRate: this.status.totalHeartbeats > 0 ? (this.status.errorCount / this.status.totalHeartbeats) * 100 : 0
    };
  }

  /**
   * Reset heartbeat statistics
   */
  reset(): void {
    this.status.totalHeartbeats = 0;
    this.status.errorCount = 0;
    this.responseTimes = [];
    this.errors = [];
    console.log('🔄 Heartbeat Monitor statistics reset');
  }
}