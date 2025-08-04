/**
 * DeepTreeEcho Heartbeat Regulator
 * 
 * Dynamically adjusts heartbeat frequency and timing based on system load
 * and performance metrics to optimize monitoring efficiency.
 */

import { AutonomyConfig } from '../config';
import { BrowserEventEmitter } from '../utils/event-emitter';

export interface RegulatorSettings {
  baseInterval: number;
  minInterval: number;
  maxInterval: number;
  loadThreshold: number;
  adaptiveMode: boolean;
}

export interface RegulatorStatus {
  isActive: boolean;
  currentInterval: number;
  adaptiveMode: boolean;
  loadLevel: 'low' | 'medium' | 'high';
  adjustments: number;
}

/**
 * Heartbeat Regulator Class
 * Dynamically adjusts heartbeat monitoring based on system conditions
 */
export class HeartbeatRegulator extends BrowserEventEmitter {
  private config: AutonomyConfig;
  private settings: RegulatorSettings;
  private status: RegulatorStatus;
  private isActive = false;
  private currentInterval: number;
  private adjustments = 0;

  constructor(config: AutonomyConfig) {
    super();
    this.config = config;
    
    this.settings = {
      baseInterval: config.get('heartbeatInterval') || 30000, // Default 30 seconds
      minInterval: 5000, // 5 seconds minimum
      maxInterval: 120000, // 2 minutes maximum
      loadThreshold: 70, // 70% CPU threshold
      adaptiveMode: true
    };

    this.currentInterval = this.settings.baseInterval;
    
    this.status = {
      isActive: false,
      currentInterval: this.currentInterval,
      adaptiveMode: this.settings.adaptiveMode,
      loadLevel: 'low',
      adjustments: 0
    };
  }

  /**
   * Initialize the regulator
   */
  async initialize(): Promise<void> {
    console.log('⚙️ Initializing Heartbeat Regulator...');
    
    // Validate settings
    if (this.settings.minInterval >= this.settings.maxInterval) {
      throw new Error('Invalid regulator settings: minInterval must be less than maxInterval');
    }

    console.log('✅ Heartbeat Regulator initialized successfully');
  }

  /**
   * Start the regulator
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    console.log('⚙️ Starting Heartbeat Regulator...');
    
    this.isActive = true;
    this.status.isActive = true;
    
    console.log('✅ Heartbeat Regulator started successfully');
  }

  /**
   * Stop the regulator
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log('⚙️ Stopping Heartbeat Regulator...');
    
    this.isActive = false;
    this.status.isActive = false;
    
    console.log('✅ Heartbeat Regulator stopped successfully');
  }

  /**
   * Get the current status
   */
  getStatus(): RegulatorStatus {
    return { ...this.status };
  }

  /**
   * Get the current interval
   */
  getCurrentInterval(): number {
    return this.currentInterval;
  }

  /**
   * Adjust interval based on system load
   */
  adjustInterval(loadMetrics: { cpuUsage: number; memoryUsage: number; responseTime: number }): number {
    if (!this.settings.adaptiveMode) {
      return this.currentInterval;
    }

    const oldInterval = this.currentInterval;
    let newInterval = this.currentInterval;

    // Determine load level
    const loadLevel = this.calculateLoadLevel(loadMetrics);
    this.status.loadLevel = loadLevel;

    // Adjust interval based on load level
    switch (loadLevel) {
      case 'low':
        // Increase interval for low load (less frequent monitoring)
        newInterval = Math.min(this.settings.maxInterval, this.currentInterval * 1.2);
        break;
      
      case 'medium':
        // Keep current interval for medium load
        newInterval = this.currentInterval;
        break;
      
      case 'high':
        // Decrease interval for high load (more frequent monitoring)
        newInterval = Math.max(this.settings.minInterval, this.currentInterval * 0.8);
        break;
    }

    // Apply the adjustment if it's significant
    if (Math.abs(newInterval - this.currentInterval) > 1000) {
      this.currentInterval = newInterval;
      this.status.currentInterval = newInterval;
      this.adjustments++;
      this.status.adjustments = this.adjustments;

      console.log(`⚙️ Heartbeat interval adjusted: ${oldInterval}ms → ${newInterval}ms (${loadLevel} load)`);
      
      // Emit adjustment event
      this.emit('intervalAdjusted', {
        oldInterval,
        newInterval,
        loadLevel,
        metrics: loadMetrics
      });
    }

    return this.currentInterval;
  }

  /**
   * Calculate load level based on metrics
   */
  private calculateLoadLevel(metrics: { cpuUsage: number; memoryUsage: number; responseTime: number }): 'low' | 'medium' | 'high' {
    const { cpuUsage, memoryUsage, responseTime } = metrics;
    
    // Calculate composite load score
    const cpuScore = cpuUsage / 100;
    const memoryScore = Math.min(memoryUsage / ((this.config.get('maxMemoryUsage') || 1024 * 1024 * 1024) / 1024 / 1024), 1);
    const responseScore = Math.min(responseTime / (this.config.get('maxResponseTime') || 5000), 1);
    
    const compositeScore = (cpuScore + memoryScore + responseScore) / 3;
    
    if (compositeScore < 0.3) {
      return 'low';
    } else if (compositeScore < 0.7) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Reset to base interval
   */
  resetInterval(): void {
    const oldInterval = this.currentInterval;
    this.currentInterval = this.settings.baseInterval;
    this.status.currentInterval = this.currentInterval;
    
    console.log(`🔄 Heartbeat interval reset: ${oldInterval}ms → ${this.currentInterval}ms`);
    
    this.emit('intervalReset', {
      oldInterval,
      newInterval: this.currentInterval
    });
  }

  /**
   * Update regulator settings
   */
  updateSettings(settings: Partial<RegulatorSettings>): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...settings };
    
    // Validate new settings
    if (this.settings.minInterval >= this.settings.maxInterval) {
      throw new Error('Invalid regulator settings: minInterval must be less than maxInterval');
    }

    // Adjust current interval if it's outside the new bounds
    if (this.currentInterval < this.settings.minInterval) {
      this.currentInterval = this.settings.minInterval;
    } else if (this.currentInterval > this.settings.maxInterval) {
      this.currentInterval = this.settings.maxInterval;
    }

    this.status.currentInterval = this.currentInterval;
    this.status.adaptiveMode = this.settings.adaptiveMode;

    console.log('⚙️ Heartbeat Regulator settings updated');
    
    this.emit('settingsUpdated', {
      oldSettings,
      newSettings: this.settings
    });
  }

  /**
   * Get regulator settings
   */
  getSettings(): RegulatorSettings {
    return { ...this.settings };
  }

  /**
   * Enable adaptive mode
   */
  enableAdaptiveMode(): void {
    this.settings.adaptiveMode = true;
    this.status.adaptiveMode = true;
    console.log('⚙️ Adaptive mode enabled');
  }

  /**
   * Disable adaptive mode
   */
  disableAdaptiveMode(): void {
    this.settings.adaptiveMode = false;
    this.status.adaptiveMode = false;
    console.log('⚙️ Adaptive mode disabled');
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    return {
      totalAdjustments: this.adjustments,
      currentInterval: this.currentInterval,
      baseInterval: this.settings.baseInterval,
      adaptiveMode: this.settings.adaptiveMode,
      loadLevel: this.status.loadLevel
    };
  }
}