/**
 * DeepTreeEcho System Test Script
 * 
 * This script tests the activation and functionality of the DeepTreeEcho
 * autonomous system.
 */

console.log('🧠 Testing DeepTreeEcho Autonomous System...')

// Import the activation functions
import { initializeFullDeepTreeEcho, progressiveActivation } from './deeptreeecho-activation'

async function testDeepTreeEcho() {
  try {
    console.log('🚀 Starting DeepTreeEcho Full Activation Test...')
    
    // Test full activation
    const result = await initializeFullDeepTreeEcho()
    
    if (result.success) {
      console.log('✅ DeepTreeEcho Full Activation Successful!')
      console.log('📊 System Status:', result.report)
      
      // Test autonomy system
      const autonomySystem = result.autonomy
      const status = autonomySystem.getStatus()
      console.log('🧠 Autonomy System Status:', status)
      
      // Test reflection cycle
      console.log('🔄 Testing reflection cycle...')
      await autonomySystem.triggerReflection()
      console.log('✅ Reflection cycle completed')
      
      // Test progressive activation
      console.log('📡 Testing progressive activation...')
      await progressiveActivation()
      
      console.log('🎉 All DeepTreeEcho tests completed successfully!')
      
    } else {
      console.error('❌ DeepTreeEcho activation failed:', result.errors)
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error)
  }
}

// Run the test
testDeepTreeEcho()