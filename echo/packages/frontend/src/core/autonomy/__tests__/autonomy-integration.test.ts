import { AutonomySystem } from '../index';
import { AutonomyConfig } from '../config';

describe('Autonomy System Integration', () => {
  let autonomySystem: AutonomySystem;

  beforeEach(() => {
    const configOptions = {
      reflectionCycleInterval: 1000,
      optimizationInterval: 2000,
      heartbeatInterval: 500,
      maxReflectionDepth: 3
    };
    autonomySystem = new AutonomySystem(configOptions);
  });

  test('should initialize autonomy system', async () => {
    await expect(autonomySystem.initialize()).resolves.not.toThrow();
  });

  test('should start and stop autonomy system', async () => {
    await autonomySystem.initialize();
    await expect(autonomySystem.start()).resolves.not.toThrow();
    await expect(autonomySystem.stop()).resolves.not.toThrow();
  });

  test('should get system status', async () => {
    await autonomySystem.initialize();
    const status = autonomySystem.getStatus();
    expect(status).toBeDefined();
    expect(status.coordinator).toBeDefined();
    expect(status.heartbeat).toBeDefined();
    expect(status.reflection).toBeDefined();
  });

  test('should trigger reflection cycle', async () => {
    await autonomySystem.initialize();
    await autonomySystem.start();
    await expect(autonomySystem.triggerReflection()).resolves.not.toThrow();
  });
});