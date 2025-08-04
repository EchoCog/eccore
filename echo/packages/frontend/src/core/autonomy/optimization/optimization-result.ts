import { OptimizationResult, Optimization } from './types';

export class OptimizationResultImpl implements OptimizationResult {
  optimizations: Optimization[];
  performanceGain: number;
  memoryReduction: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';

  constructor() {
    this.optimizations = [];
    this.performanceGain = 0;
    this.memoryReduction = 0;
    this.duration = 0;
    this.status = 'success';
  }
}