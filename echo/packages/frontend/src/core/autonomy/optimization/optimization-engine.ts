import { AutonomyConfig } from '../config';
import { MemoryOptimizer } from './memory-optimizer';
import { PerformanceOptimizer } from './performance-optimizer';
import { PatternOptimizer } from './pattern-optimizer';
import { OptimizationResult } from './types';
import { OptimizationResultImpl } from './optimization-result';

export class OptimizationEngine {
  private config: AutonomyConfig;
  private memoryOptimizer: MemoryOptimizer;
  private performanceOptimizer: PerformanceOptimizer;
  private patternOptimizer: PatternOptimizer;

  constructor(config: AutonomyConfig) {
    this.config = config;
    this.memoryOptimizer = new MemoryOptimizer(config);
    this.performanceOptimizer = new PerformanceOptimizer(config);
    this.patternOptimizer = new PatternOptimizer(config);
  }

  async initialize(): Promise<void> {
    console.log('⚡ Initializing Optimization Engine...');
    await this.memoryOptimizer.initialize();
    await this.performanceOptimizer.initialize();
    await this.patternOptimizer.initialize();
    console.log('✅ Optimization Engine initialized successfully');
  }

  async start(): Promise<void> {
    console.log('⚡ Starting Optimization Engine...');
    await this.memoryOptimizer.start();
    await this.performanceOptimizer.start();
    await this.patternOptimizer.start();
    console.log('✅ Optimization Engine started successfully');
  }

  async stop(): Promise<void> {
    console.log('⚡ Stopping Optimization Engine...');
    await this.memoryOptimizer.stop();
    await this.performanceOptimizer.stop();
    await this.patternOptimizer.stop();
    console.log('✅ Optimization Engine stopped successfully');
  }

  async performCycle(): Promise<OptimizationResult> {
    const results = await Promise.all([
      this.memoryOptimizer.performCycle(),
      this.performanceOptimizer.performCycle(),
      this.patternOptimizer.performCycle()
    ]);

    const combinedResult = new OptimizationResultImpl();
    combinedResult.optimizations = results.flatMap(r => r.optimizations);
    combinedResult.performanceGain = results.reduce((sum, r) => sum + r.performanceGain, 0);
    combinedResult.memoryReduction = results.reduce((sum, r) => sum + r.memoryReduction, 0);
    combinedResult.duration = results.reduce((sum, r) => sum + r.duration, 0);
    combinedResult.status = results.every(r => r.status === 'success') ? 'success' : 'partial';

    return combinedResult;
  }

  getStatus() {
    return {
      memory: this.memoryOptimizer.getStatus(),
      performance: this.performanceOptimizer.getStatus(),
      pattern: this.patternOptimizer.getStatus()
    };
  }
}