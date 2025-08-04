/**
 * DeepTreeEcho Autonomy Monitor
 * 
 * Monitors the overall health and performance of the autonomy system,
 * providing real-time alerts and status updates.
 */

import { AutonomyConfig } from '../config';
import { BrowserEventEmitter } from '../utils/event-emitter';

export interface MonitorStatus {
  isRunning: boolean;
  isHealthy: boolean;
  lastCheck: Date | null;
  totalChecks: number;
  errorCount: number;
  alertCount: number;
  health: 'healthy' | 'warning' | 'critical';
}

export interface MonitorAlert {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  data?: any;
}

/**
 * Autonomy Monitor Class
 * Monitors system health and provides alerts
 */
export class AutonomyMonitor extends BrowserEventEmitter {
  private config: AutonomyConfig;
  private isRunning = false;
  private interval?: NodeJS.Timeout;
  private status: MonitorStatus;
  private alerts: MonitorAlert[] = [];

  constructor(config: AutonomyConfig) {
    super();
    this.config = config;
    
    this.status = {
      isRunning: false,
      isHealthy: true,
      lastCheck: null,
      totalChecks: 0,
      errorCount: 0,
      alertCount: 0,
      health: 'healthy'
    };
  }

  /**
   * Initialize the monitor
   */
  async initialize(): Promise<void> {
    console.log('📊 Initializing Autonomy Monitor...');
    
    // Validate configuration
    const validation = this.config.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid monitor configuration: ${validation.errors.join(', ')}`);
    }

    console.log('✅ Autonomy Monitor initialized successfully');
  }

  /**
   * Start the monitor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    console.log('📊 Starting Autonomy Monitor...');
    
    const interval = this.config.get('metricsCollectionInterval');
    this.interval = setInterval(() => {
      this.performHealthCheck();
    }, interval);

    this.isRunning = true;
    this.status.isRunning = true;
    
    console.log('✅ Autonomy Monitor started successfully');
  }

  /**
   * Stop the monitor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('📊 Stopping Autonomy Monitor...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    this.isRunning = false;
    this.status.isRunning = false;
    
    console.log('✅ Autonomy Monitor stopped successfully');
  }

  /**
   * Get the current status
   */
  getStatus(): MonitorStatus {
    return { ...this.status };
  }

  /**
   * Perform a health check
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check memory usage
      const memoryUsage = this.measureMemoryUsage();
      const maxMemory = (this.config.get('maxMemoryUsage') || 1024 * 1024 * 1024) / 1024 / 1024; // Convert to MB, default 1GB
      
      if (memoryUsage > maxMemory * 0.9) {
        this.createAlert('critical', 'memory', `Memory usage critical: ${memoryUsage}MB / ${maxMemory}MB`);
        this.status.health = 'critical';
      } else if (memoryUsage > maxMemory * 0.7) {
        this.createAlert('warning', 'memory', `Memory usage high: ${memoryUsage}MB / ${maxMemory}MB`);
        this.status.health = 'warning';
      }

      // Check CPU usage
      const cpuUsage = await this.measureCpuUsage();
      const maxCpu = this.config.get('maxCpuUsage') || 80; // Default 80%
      
      if (cpuUsage > maxCpu * 0.9) {
        this.createAlert('critical', 'cpu', `CPU usage critical: ${cpuUsage}% / ${maxCpu}%`);
        this.status.health = 'critical';
      } else if (cpuUsage > maxCpu * 0.7) {
        this.createAlert('warning', 'cpu', `CPU usage high: ${cpuUsage}% / ${maxCpu}%`);
        this.status.health = 'warning';
      }

      // Check response time
      const responseTime = Date.now() - startTime;
      const maxResponseTime = this.config.get('maxResponseTime') || 5000; // Default 5 seconds
      
      if (responseTime > maxResponseTime * 0.9) {
        this.createAlert('critical', 'performance', `Response time critical: ${responseTime}ms / ${maxResponseTime}ms`);
        this.status.health = 'critical';
      } else if (responseTime > maxResponseTime * 0.7) {
        this.createAlert('warning', 'performance', `Response time high: ${responseTime}ms / ${maxResponseTime}ms`);
        this.status.health = 'warning';
      }

      // Update status
      this.status.lastCheck = new Date();
      this.status.totalChecks++;
      this.status.isHealthy = this.status.health === 'healthy';

      // Emit health change event if status changed
      this.emit('healthChange', this.status.health);

      // Log status
      if (this.status.isHealthy) {
        console.log(`📊 Health check: Memory=${memoryUsage}MB, CPU=${cpuUsage}%, Response=${responseTime}ms`);
      } else {
        console.warn(`⚠️ Unhealthy system: ${this.status.health} status`);
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.status.errorCount++;
      this.createAlert('critical', 'system', `Health check failed: ${error}`);
      this.status.health = 'critical';
    }
  }

  /**
   * Create an alert
   */
  private createAlert(level: 'info' | 'warning' | 'critical', category: string, message: string, data?: any): void {
    const alert: MonitorAlert = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data
    };

    this.alerts.push(alert);
    this.status.alertCount++;

    // Emit alert event
    this.emit('alert', alert);
    
    // Emit critical event for critical alerts
    if (level === 'critical') {
      this.emit('critical', alert);
    }

    console.log(`🚨 Alert [${level.toUpperCase()}]: ${message}`);
  }

  /**
   * Measure memory usage
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
   * Measure CPU usage
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
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 20): MonitorAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: 'info' | 'warning' | 'critical'): MonitorAlert[] {
    return this.alerts.filter(alert => alert.level === level);
  }

  /**
   * Get alerts by category
   */
  getAlertsByCategory(category: string): MonitorAlert[] {
    return this.alerts.filter(alert => alert.category === category);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThan: Date): void {
    const oldCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => alert.timestamp > olderThan);
    const newCount = this.alerts.length;
    
    if (oldCount !== newCount) {
      console.log(`🗑️ Cleared ${oldCount - newCount} old alerts`);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      memoryUsage: this.measureMemoryUsage(),
      cpuUsage: this.status.totalChecks > 0 ? 50 : 0, // Simplified estimation
      responseTime: this.status.lastCheck ? Date.now() - this.status.lastCheck.getTime() : 0,
      errorRate: this.status.totalChecks > 0 ? (this.status.errorCount / this.status.totalChecks) * 100 : 0,
      alertRate: this.status.totalChecks > 0 ? (this.status.alertCount / this.status.totalChecks) * 100 : 0
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset monitor statistics
   */
  reset(): void {
    this.status.totalChecks = 0;
    this.status.errorCount = 0;
    this.status.alertCount = 0;
    this.alerts = [];
    console.log('🔄 Autonomy Monitor statistics reset');
  }
}