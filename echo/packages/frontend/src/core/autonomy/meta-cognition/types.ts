/**
 * DeepTreeEcho Meta-Cognition Types
 * 
 * Defines data structures and interfaces for meta-cognitive reflection
 * and self-improvement processes.
 */

export interface ReflectionInsight {
  id: string;
  timestamp: Date;
  type: 'performance' | 'behavior' | 'pattern' | 'optimization' | 'learning';
  category: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  data?: any;
}

export interface ReflectionCycle {
  id: string;
  timestamp: Date;
  depth: number;
  duration: number;
  insights: ReflectionInsight[];
  improvements: Improvement[];
  status: 'completed' | 'failed' | 'partial';
  error?: string;
}

export interface Improvement {
  id: string;
  timestamp: Date;
  type: 'performance' | 'memory' | 'behavior' | 'optimization';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  implemented: boolean;
  impact: {
    performance: number; // 0-1
    memory: number; // 0-1
    stability: number; // 0-1
  };
  data?: any;
}

export interface MetaCognitiveState {
  currentDepth: number;
  maxDepth: number;
  totalCycles: number;
  totalInsights: number;
  totalImprovements: number;
  lastCycle: Date | null;
  isActive: boolean;
  health: 'healthy' | 'warning' | 'critical';
}

export interface ReflectionContext {
  systemState: any;
  performanceMetrics: any;
  recentEvents: any[];
  patterns: any[];
  goals: any[];
}

export interface ReflectionResult {
  depth: number;
  insights: ReflectionInsight[];
  improvements: Improvement[];
  duration: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

export interface MetaCognitiveConfig {
  maxDepth: number;
  cycleInterval: number;
  insightThreshold: number;
  improvementThreshold: number;
  enableDeepReflection: boolean;
  enablePatternRecognition: boolean;
  enableSelfImprovement: boolean;
}

export interface PatternRecognition {
  id: string;
  pattern: string;
  frequency: number;
  confidence: number;
  category: string;
  description: string;
  actionable: boolean;
}

export interface LearningOutcome {
  id: string;
  timestamp: Date;
  type: 'performance' | 'behavior' | 'pattern';
  description: string;
  confidence: number;
  applied: boolean;
  impact: number;
}

export interface SelfImprovementPlan {
  id: string;
  timestamp: Date;
  goals: string[];
  strategies: string[];
  timeline: number; // milliseconds
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  progress: number; // 0-1
}