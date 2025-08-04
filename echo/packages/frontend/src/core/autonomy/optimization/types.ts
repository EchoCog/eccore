export interface OptimizationResult {
  optimizations: Optimization[];
  performanceGain: number;
  memoryReduction: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';
}

export interface Optimization {
  id: string;
  type: 'memory' | 'performance' | 'pattern' | 'behavior';
  description: string;
  impact: number;
  applied: boolean;
  data?: any;
}