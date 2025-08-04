/**
 * DeepTreeEcho Autonomy Configuration
 * 
 * Manages configuration parameters for the autonomy subsystem including
 * reflection cycles, optimization settings, and system behavior.
 */

export interface AutonomyConfigOptions {
  // Reflection settings
  reflectionCycleInterval?: number; // milliseconds
  maxReflectionDepth?: number;
  enableMetaCognition?: boolean;
  
  // Optimization settings
  optimizationEnabled?: boolean;
  optimizationInterval?: number; // milliseconds
  maxOptimizationIterations?: number;
  
  // Heartbeat settings
  heartbeatInterval?: number; // milliseconds
  heartbeatTimeout?: number; // milliseconds
  
  // Monitoring settings
  monitoringEnabled?: boolean;
  metricsCollectionInterval?: number; // milliseconds
  
  // Analysis settings
  codeAnalysisEnabled?: boolean;
  patternDetectionEnabled?: boolean;
  
  // Validation settings
  validationEnabled?: boolean;
  safetyChecksEnabled?: boolean;
  
  // Performance settings
  maxMemoryUsage?: number; // bytes
  maxCpuUsage?: number; // percentage
  maxResponseTime?: number; // milliseconds
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AutonomyConfigOptions> = {
  reflectionCycleInterval: 60000, // 1 minute
  maxReflectionDepth: 5,
  enableMetaCognition: true,
  
  optimizationEnabled: true,
  optimizationInterval: 300000, // 5 minutes
  maxOptimizationIterations: 10,
  
  heartbeatInterval: 30000, // 30 seconds
  heartbeatTimeout: 10000, // 10 seconds
  
  monitoringEnabled: true,
  metricsCollectionInterval: 60000, // 1 minute
  
  codeAnalysisEnabled: true,
  patternDetectionEnabled: true,
  
  validationEnabled: true,
  safetyChecksEnabled: true,
  
  maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
  maxCpuUsage: 80, // 80%
  maxResponseTime: 5000 // 5 seconds
};

/**
 * Autonomy Configuration Class
 * Manages all configuration parameters for the autonomy subsystem
 */
export class AutonomyConfig {
  private config: Required<AutonomyConfigOptions>;
  private listeners: Map<string, Set<(config: AutonomyConfig) => void>> = new Map();

  constructor(options?: Partial<AutonomyConfigOptions>) {
    this.config = { ...DEFAULT_CONFIG, ...options };
  }

  /**
   * Get a configuration value
   */
  get<K extends keyof AutonomyConfigOptions>(key: K): AutonomyConfigOptions[K] {
    return this.config[key];
  }

  /**
   * Set a configuration value
   */
  set<K extends keyof AutonomyConfigOptions>(key: K, value: AutonomyConfigOptions[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value as Required<AutonomyConfigOptions>[K];
    
    // Notify listeners
    this.notifyListeners(key, oldValue, value);
  }

  /**
   * Get all configuration values
   */
  getAll(): Required<AutonomyConfigOptions> {
    return { ...this.config };
  }

  /**
   * Update multiple configuration values
   */
  update(updates: Partial<AutonomyConfigOptions>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    // Notify listeners for each changed key
    Object.keys(updates).forEach(key => {
      const k = key as keyof AutonomyConfigOptions;
      this.notifyListeners(k, oldConfig[k], this.config[k]);
    });
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.notifyListeners('*', null, this.config);
  }

  /**
   * Add a configuration change listener
   */
  addListener(key: string, listener: (config: AutonomyConfig) => void): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
  }

  /**
   * Remove a configuration change listener
   */
  removeListener(key: string, listener: (config: AutonomyConfig) => void): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(key);
      }
    }
  }

  /**
   * Notify listeners of configuration changes
   */
  private notifyListeners(key: string, oldValue: any, newValue: any): void {
    // Notify specific key listeners
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(this);
        } catch (error) {
          console.error(`Error in configuration listener for key ${key}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(this);
        } catch (error) {
          console.error('Error in wildcard configuration listener:', error);
        }
      });
    }
  }

  /**
   * Validate configuration values
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.reflectionCycleInterval < 1000) {
      errors.push('reflectionCycleInterval must be at least 1000ms');
    }

    if (this.config.maxReflectionDepth < 1 || this.config.maxReflectionDepth > 10) {
      errors.push('maxReflectionDepth must be between 1 and 10');
    }

    if (this.config.optimizationInterval < 10000) {
      errors.push('optimizationInterval must be at least 10000ms');
    }

    if (this.config.heartbeatInterval < 5000) {
      errors.push('heartbeatInterval must be at least 5000ms');
    }

    if (this.config.maxCpuUsage < 1 || this.config.maxCpuUsage > 100) {
      errors.push('maxCpuUsage must be between 1 and 100');
    }

    if (this.config.maxMemoryUsage < 1024 * 1024) {
      errors.push('maxMemoryUsage must be at least 1MB');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.update(parsed);
    } catch (error) {
      console.error('Error parsing configuration JSON:', error);
      throw new Error('Invalid configuration JSON');
    }
  }

  /**
   * Get configuration summary
   */
  getSummary(): Record<string, any> {
    return {
      reflection: {
        cycleInterval: this.config.reflectionCycleInterval,
        maxDepth: this.config.maxReflectionDepth,
        metaCognitionEnabled: this.config.enableMetaCognition
      },
      optimization: {
        enabled: this.config.optimizationEnabled,
        interval: this.config.optimizationInterval,
        maxIterations: this.config.maxOptimizationIterations
      },
      monitoring: {
        enabled: this.config.monitoringEnabled,
        heartbeatInterval: this.config.heartbeatInterval,
        metricsInterval: this.config.metricsCollectionInterval
      },
      analysis: {
        codeAnalysisEnabled: this.config.codeAnalysisEnabled,
        patternDetectionEnabled: this.config.patternDetectionEnabled
      },
      validation: {
        enabled: this.config.validationEnabled,
        safetyChecksEnabled: this.config.safetyChecksEnabled
      },
      performance: {
        maxMemoryUsage: this.config.maxMemoryUsage,
        maxCpuUsage: this.config.maxCpuUsage,
        maxResponseTime: this.config.maxResponseTime
      }
    };
  }
}