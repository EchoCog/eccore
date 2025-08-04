export interface MetricsData {
  timestamp: Date;
  type: string;
  value: number;
  unit: string;
}

export interface MetricsCollection {
  id: string;
  timestamp: Date;
  metrics: MetricsData[];
}