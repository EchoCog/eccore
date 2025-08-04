/**
 * Test the DeepTreeEcho Autonomous Startup System
 * 
 * This test verifies that the autonomous startup system works correctly
 * in a browser environment and integrates properly with the autonomy system.
 */

import { AutonomousStartup } from './core/startup/AutonomousStartup';
import { AutonomySystem } from './core/autonomy';

async function testAutonomousStartup() {
  console.log('🧪 Testing DeepTreeEcho Autonomous Startup...');
  
  try {
    // Test 1: Create the startup system
    console.log('📝 Creating AutonomousStartup instance...');
    const startup = new AutonomousStartup({
      enableDiagnostics: true,
      enableResourceMounting: true,
      enableToolDeployment: false, // Skip tools for basic test
      enablePromptRewriting: false, // Skip prompts for basic test
      enableBrowserIntegration: false, // Skip browser for basic test
      enableNetworkConfiguration: false, // Skip network for basic test
      enableGitHubIntegration: false, // Skip GitHub for basic test
      enableVisionCalibration: false // Skip vision for basic test
    });
    
    console.log('✅ AutonomousStartup created successfully');
    
    // Test 2: Initialize the startup system
    console.log('🚀 Initializing startup system...');
    const report = await startup.initialize();
    
    console.log('📊 Startup Report:', {
      success: report.overall.success,
      duration: report.overall.duration,
      errors: report.overall.errors,
      diagnostics: report.diagnostics,
      resources: report.resources
    });
    
    if (report.overall.success) {
      console.log('✅ Autonomous startup completed successfully!');
      
      // Test 3: Get the autonomy system
      const autonomySystem = startup.getAutonomySystem();
      console.log('🧠 Autonomy system status:', autonomySystem.getStatus());
      
      // Test 4: Trigger a reflection cycle
      console.log('🔄 Triggering reflection cycle...');
      await autonomySystem.triggerReflection();
      console.log('✅ Reflection cycle completed');
      
      return true;
    } else {
      console.error('❌ Autonomous startup failed:', report.overall.errors);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Export for use in other tests
export { testAutonomousStartup };

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testDeepTreeEcho = testAutonomousStartup;
  console.log('🌐 DeepTreeEcho test function available as window.testDeepTreeEcho()');
}