import { AutonomyConfig } from '../config';
import { OptimizationResult, Optimization } from './types';

export abstract class BaseOptimizer {
  protected config: AutonomyConfig;

  constructor(config: AutonomyConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract performCycle(): Promise<OptimizationResult>;
  abstract getStatus(): any;
}