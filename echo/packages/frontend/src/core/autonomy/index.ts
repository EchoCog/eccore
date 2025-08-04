/**
 * DeepTreeEcho Autonomy Subsystem
 * 
 * This module provides the core autonomy functionality for the DeepTreeEcho system,
 * including meta-cognitive reflection, self-improvement, and adaptive personality.
 */

export * from './coordinator';
export * from './config';
export * from './heartbeat';
export * from './meta-cognition';
export * from './monitoring';
export * from './optimization';
export * from './validation';
export * from './analysis';
export * from './metrics';

import { AutonomyCoordinator } from './coordinator';
import { AutonomyConfig, AutonomyConfigOptions } from './config';
import { HeartbeatMonitor } from './heartbeat';
import { ReflectionEngine } from './meta-cognition';
import { AutonomyMonitor } from './monitoring';
import { OptimizationEngine } from './optimization';
import { CodeAnalyzer } from './analysis';
import { MetricsCollector } from './metrics';

/**
 * Main Autonomy System Class
 * Orchestrates all autonomy components and provides the primary interface
 */
export class AutonomySystem {
  private coordinator: AutonomyCoordinator;
  private heartbeat: HeartbeatMonitor;
  private reflection: ReflectionEngine;
  private monitor: AutonomyMonitor;
  private optimizer: OptimizationEngine;
  private analyzer: CodeAnalyzer;
  private metrics: MetricsCollector;
  private config: AutonomyConfig;

  constructor(config?: Partial<AutonomyConfigOptions>) {
    this.config = new AutonomyConfig(config);
    this.coordinator = new AutonomyCoordinator(this.config);
    this.heartbeat = new HeartbeatMonitor(this.config);
    this.reflection = new ReflectionEngine(this.config);
    this.monitor = new AutonomyMonitor(this.config);
    this.optimizer = new OptimizationEngine(this.config);
    this.analyzer = new CodeAnalyzer(this.config);
    this.metrics = new MetricsCollector(this.config);
  }

  /**
   * Initialize the autonomy system
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing DeepTreeEcho Autonomy System...');
    
    await this.coordinator.initialize();
    await this.heartbeat.start();
    await this.reflection.initialize();
    await this.monitor.start();
    await this.optimizer.initialize();
    await this.analyzer.initialize();
    await this.metrics.initialize();

    console.log('✅ Autonomy System initialized successfully');
  }

  /**
   * Start the autonomy system
   */
  async start(): Promise<void> {
    console.log('🚀 Starting DeepTreeEcho Autonomy System...');
    
    await this.coordinator.start();
    await this.reflection.start();
    await this.optimizer.start();
    
    console.log('✅ Autonomy System started successfully');
  }

  /**
   * Stop the autonomy system
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping DeepTreeEcho Autonomy System...');
    
    await this.coordinator.stop();
    await this.heartbeat.stop();
    await this.reflection.stop();
    await this.monitor.stop();
    await this.optimizer.stop();
    
    console.log('✅ Autonomy System stopped successfully');
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      coordinator: this.coordinator.getStatus(),
      heartbeat: this.heartbeat.getStatus(),
      reflection: this.reflection.getStatus(),
      monitor: this.monitor.getStatus(),
      optimizer: this.optimizer.getStatus(),
      analyzer: this.analyzer.getStatus(),
      metrics: this.metrics.getStatus()
    };
  }

  /**
   * Trigger a meta-cognitive reflection cycle
   */
  async triggerReflection(): Promise<void> {
    console.log('🧠 Triggering meta-cognitive reflection cycle...');
    await this.reflection.triggerCycle();
  }

  /**
   * Get the coordinator for direct access
   */
  getCoordinator(): AutonomyCoordinator {
    return this.coordinator;
  }

  /**
   * Get the reflection engine for direct access
   */
  getReflectionEngine(): ReflectionEngine {
    return this.reflection;
  }

  /**
   * Get the optimization engine for direct access
   */
  getOptimizationEngine(): OptimizationEngine {
    return this.optimizer;
  }
}

// Export the main class
export default AutonomySystem;