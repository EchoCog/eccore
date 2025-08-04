import { AutonomyConfig } from '../config';
import { ReflectionEngine } from './reflection-engine';

export class SystemOrchestrator {
  private config: AutonomyConfig;
  private reflection: ReflectionEngine;

  constructor(config: AutonomyConfig) {
    this.config = config;
    this.reflection = new ReflectionEngine(config);
  }

  async initialize(): Promise<void> {
    console.log('🎭 Initializing System Orchestrator...');
    await this.reflection.initialize();
  }

  async start(): Promise<void> {
    console.log('🎭 Starting System Orchestrator...');
    await this.reflection.start();
  }

  async stop(): Promise<void> {
    console.log('🎭 Stopping System Orchestrator...');
    await this.reflection.stop();
  }

  getStatus() {
    return {
      reflection: this.reflection.getStatus(),
      type: 'orchestrator'
    };
  }
}