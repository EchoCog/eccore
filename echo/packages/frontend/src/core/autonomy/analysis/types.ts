export interface AnalysisResult {
  patterns: Pattern[];
  metrics: Metrics;
  recommendations: Recommendation[];
}

export interface Pattern {
  id: string;
  type: string;
  confidence: number;
  description: string;
  data?: any;
}

export interface Metrics {
  complexity: number;
  performance: number;
  memory: number;
  stability: number;
}

export interface Recommendation {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  impact: number;
}