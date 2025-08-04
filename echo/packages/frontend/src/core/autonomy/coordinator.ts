/**
 * DeepTreeEcho Autonomy Coordinator
 * 
 * Orchestrates all autonomy components and manages the overall system flow,
 * including coordination between reflection, optimization, and monitoring.
 */

import { AutonomyConfig } from './config';
import { HeartbeatMonitor } from './heartbeat';
import { ReflectionEngine } from './meta-cognition';
import { AutonomyMonitor } from './monitoring';
import { OptimizationEngine } from './optimization';
import { CodeAnalyzer } from './analysis';
import { MetricsCollector } from './metrics';

export interface AutonomyState {
  isRunning: boolean;
  isInitialized: boolean;
  lastReflectionCycle: Date | null;
  lastOptimizationCycle: Date | null;
  totalReflectionCycles: number;
  totalOptimizationCycles: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
  };
}

/**
 * Autonomy Coordinator Class
 * Manages the overall autonomy system and coordinates between components
 */
export class AutonomyCoordinator {
  private config: AutonomyConfig;
  private heartbeat: HeartbeatMonitor;
  private reflection: ReflectionEngine;
  private monitor: AutonomyMonitor;
  private optimizer: OptimizationEngine;
  private analyzer: CodeAnalyzer;
  private metrics: MetricsCollector;
  
  private state: AutonomyState;
  private isInitialized = false;
  private isRunning = false;
  private reflectionInterval?: NodeJS.Timeout;
  private optimizationInterval?: NodeJS.Timeout;

  constructor(config: AutonomyConfig) {
    this.config = config;
    this.heartbeat = new HeartbeatMonitor(config);
    this.reflection = new ReflectionEngine(config);
    this.monitor = new AutonomyMonitor(config);
    this.optimizer = new OptimizationEngine(config);
    this.analyzer = new CodeAnalyzer(config);
    this.metrics = new MetricsCollector(config);

    this.state = {
      isRunning: false,
      isInitialized: false,
      lastReflectionCycle: null,
      lastOptimizationCycle: null,
      totalReflectionCycles: 0,
      totalOptimizationCycles: 0,
      systemHealth: 'healthy',
      performanceMetrics: {
        memoryUsage: 0,
        cpuUsage: 0,
        responseTime: 0
      }
    };
  }

  /**
   * Initialize the coordinator
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing Autonomy Coordinator...');
    
    try {
      // Initialize all components
      await this.heartbeat.initialize();
      await this.reflection.initialize();
      await this.monitor.initialize();
      await this.optimizer.initialize();
      await this.analyzer.initialize();
      await this.metrics.initialize();

      // Set up event listeners
      this.setupEventListeners();

      this.state.isInitialized = true;
      console.log('✅ Autonomy Coordinator initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Autonomy Coordinator:', error);
      throw error;
    }
  }

  /**
   * Start the coordinator
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Coordinator must be initialized before starting');
    }

    console.log('🚀 Starting Autonomy Coordinator...');
    
    try {
      // Start all components
      await this.heartbeat.start();
      await this.reflection.start();
      await this.monitor.start();
      await this.optimizer.start();
      await this.metrics.start();

      // Start periodic cycles
      this.startReflectionCycles();
      this.startOptimizationCycles();

      this.state.isRunning = true;
      console.log('✅ Autonomy Coordinator started successfully');
    } catch (error) {
      console.error('❌ Failed to start Autonomy Coordinator:', error);
      throw error;
    }
  }

  /**
   * Stop the coordinator
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Autonomy Coordinator...');
    
    // Stop periodic cycles
    this.stopReflectionCycles();
    this.stopOptimizationCycles();

    // Stop all components
    await this.heartbeat.stop();
    await this.reflection.stop();
    await this.monitor.stop();
    await this.optimizer.stop();
    await this.metrics.stop();

    this.state.isRunning = false;
    console.log('✅ Autonomy Coordinator stopped successfully');
  }

  /**
   * Get the current state
   */
  getState(): AutonomyState {
    return { ...this.state };
  }

  /**
   * Get the status of all components
   */
  getStatus() {
    return {
      coordinator: {
        isRunning: this.state.isRunning,
        isInitialized: this.state.isInitialized,
        systemHealth: this.state.systemHealth
      },
      heartbeat: this.heartbeat.getStatus(),
      reflection: this.reflection.getStatus(),
      monitor: this.monitor.getStatus(),
      optimizer: this.optimizer.getStatus(),
      analyzer: this.analyzer.getStatus(),
      metrics: this.metrics.getStatus()
    };
  }

  /**
   * Trigger a manual reflection cycle
   */
  async triggerReflectionCycle(): Promise<void> {
    console.log('🧠 Triggering manual reflection cycle...');
    await this.performReflectionCycle();
  }

  /**
   * Trigger a manual optimization cycle
   */
  async triggerOptimizationCycle(): Promise<void> {
    console.log('⚡ Triggering manual optimization cycle...');
    await this.performOptimizationCycle();
  }

  /**
   * Perform a reflection cycle
   */
  private async performReflectionCycle(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Perform reflection
      const reflectionResult = await this.reflection.performCycle();
      
      // Update metrics
      await this.metrics.recordReflectionCycle({
        duration: Date.now() - startTime,
        depth: reflectionResult.depth,
        insights: reflectionResult.insights.length,
        improvements: reflectionResult.improvements.length
      });

      // Update state
      this.state.lastReflectionCycle = new Date();
      this.state.totalReflectionCycles++;

      console.log(`✅ Reflection cycle completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Reflection cycle failed:', error);
      this.state.systemHealth = 'warning';
    }
  }

  /**
   * Perform an optimization cycle
   */
  private async performOptimizationCycle(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Perform optimization
      const optimizationResult = await this.optimizer.performCycle();
      
      // Update metrics
      await this.metrics.recordOptimizationCycle({
        duration: Date.now() - startTime,
        optimizations: optimizationResult.optimizations.length,
        performanceGain: optimizationResult.performanceGain,
        memoryReduction: optimizationResult.memoryReduction
      });

      // Update state
      this.state.lastOptimizationCycle = new Date();
      this.state.totalOptimizationCycles++;

      console.log(`✅ Optimization cycle completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('❌ Optimization cycle failed:', error);
      this.state.systemHealth = 'warning';
    }
  }

  /**
   * Start periodic reflection cycles
   */
  private startReflectionCycles(): void {
    const interval = this.config.get('reflectionCycleInterval');
    this.reflectionInterval = setInterval(() => {
      this.performReflectionCycle();
    }, interval);
  }

  /**
   * Stop periodic reflection cycles
   */
  private stopReflectionCycles(): void {
    if (this.reflectionInterval) {
      clearInterval(this.reflectionInterval);
      this.reflectionInterval = undefined;
    }
  }

  /**
   * Start periodic optimization cycles
   */
  private startOptimizationCycles(): void {
    const interval = this.config.get('optimizationInterval');
    this.optimizationInterval = setInterval(() => {
      this.performOptimizationCycle();
    }, interval);
  }

  /**
   * Stop periodic optimization cycles
   */
  private stopOptimizationCycles(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }
  }

  /**
   * Set up event listeners for component communication
   */
  private setupEventListeners(): void {
    // Listen for heartbeat events
    this.heartbeat.on('heartbeat', (data) => {
      this.state.performanceMetrics = {
        memoryUsage: data.memoryUsage,
        cpuUsage: data.cpuUsage,
        responseTime: data.responseTime
      };
    });

    // Listen for health status changes
    this.monitor.on('healthChange', (health) => {
      this.state.systemHealth = health;
    });

    // Listen for critical events
    this.monitor.on('critical', (event) => {
      console.warn('🚨 Critical autonomy event:', event);
      this.state.systemHealth = 'critical';
    });
  }

  /**
   * Get component references for direct access
   */
  getHeartbeat(): HeartbeatMonitor {
    return this.heartbeat;
  }

  getReflection(): ReflectionEngine {
    return this.reflection;
  }

  getMonitor(): AutonomyMonitor {
    return this.monitor;
  }

  getOptimizer(): OptimizationEngine {
    return this.optimizer;
  }

  getAnalyzer(): CodeAnalyzer {
    return this.analyzer;
  }

  getMetrics(): MetricsCollector {
    return this.metrics;
  }
}