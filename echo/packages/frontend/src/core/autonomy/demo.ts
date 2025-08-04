/**
 * DeepTreeEcho Autonomy System Demo
 * 
 * Demonstrates the autonomy system functionality including
 * reflection cycles, optimization, and monitoring.
 */

import { AutonomySystem } from './index';
import { AutonomyConfig } from './config';

async function runAutonomyDemo() {
  console.log('🧠 DeepTreeEcho Autonomy System Demo');
  console.log('=====================================\n');

  // Create configuration options
  const configOptions = {
    reflectionCycleInterval: 5000, // 5 seconds
    optimizationInterval: 10000,    // 10 seconds
    heartbeatInterval: 2000,        // 2 seconds
    maxReflectionDepth: 3,
    enableMetaCognition: true,
    optimizationEnabled: true,
    monitoringEnabled: true
  };

  // Create autonomy system
  const autonomySystem = new AutonomySystem(configOptions);

  try {
    // Initialize the system
    console.log('🚀 Initializing autonomy system...');
    await autonomySystem.initialize();
    console.log('✅ System initialized successfully\n');

    // Start the system
    console.log('🚀 Starting autonomy system...');
    await autonomySystem.start();
    console.log('✅ System started successfully\n');

    // Display initial status
    console.log('📊 Initial System Status:');
    const initialStatus = autonomySystem.getStatus();
    console.log(JSON.stringify(initialStatus, null, 2));
    console.log('');

    // Trigger a manual reflection cycle
    console.log('🧠 Triggering manual reflection cycle...');
    await autonomySystem.triggerReflection();
    console.log('✅ Reflection cycle completed\n');

    // Wait a bit and check status again
    console.log('⏳ Waiting for system to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📊 Updated System Status:');
    const updatedStatus = autonomySystem.getStatus();
    console.log(JSON.stringify(updatedStatus, null, 2));
    console.log('');

    // Run for a few more cycles
    console.log('🔄 Running system for additional cycles...');
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Cycle ${i + 1} ---`);
      await autonomySystem.triggerReflection();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const status = autonomySystem.getStatus();
      console.log(`Reflection cycles: ${status.reflection.totalCycles}`);
      console.log(`Total insights: ${status.reflection.totalInsights}`);
      console.log(`Total improvements: ${status.reflection.totalImprovements}`);
    }

    // Stop the system
    console.log('\n🛑 Stopping autonomy system...');
    await autonomySystem.stop();
    console.log('✅ System stopped successfully');

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runAutonomyDemo().catch(console.error);
}

export { runAutonomyDemo };