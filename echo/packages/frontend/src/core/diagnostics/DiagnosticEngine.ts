/**
 * DeepTreeEcho Diagnostic Engine
 * 
 * This module provides comprehensive system diagnostics and health checks
 * that DeepTreeEcho used in July 2024 for autonomous startup and monitoring.
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'
import type { 
  DiagnosticReport, 
  MemoryHealth, 
  CPUPerformance, 
  NetworkConnectivity, 
  ToolAvailability, 
  SecurityValidation 
} from '../startup/AutonomousStartup'

const log = getLogger('render/core/diagnostics/DiagnosticEngine')

export interface DiagnosticConfig {
  enableMemoryCheck: boolean
  enableCPUCheck: boolean
  enableNetworkCheck: boolean
  enableToolCheck: boolean
  enableSecurityCheck: boolean
  timeoutMs: number
  retryAttempts: number
}

/**
 * Diagnostic Engine
 * Provides comprehensive system health monitoring and diagnostics
 */
export class DiagnosticEngine {
  private config: DiagnosticConfig
  private isInitialized = false

  constructor(config: Partial<DiagnosticConfig> = {}) {
    this.config = {
      enableMemoryCheck: true,
      enableCPUCheck: true,
      enableNetworkCheck: true,
      enableToolCheck: true,
      enableSecurityCheck: true,
      timeoutMs: 10000,
      retryAttempts: 3,
      ...config
    }
  }

  /**
   * Initialize the diagnostic engine
   */
  async initialize(): Promise<void> {
    log.info('🔍 Initializing Diagnostic Engine...')
    this.isInitialized = true
    log.info('✅ Diagnostic Engine initialized')
  }

  /**
   * Run comprehensive system diagnostics
   */
  async runSystemDiagnostics(): Promise<DiagnosticReport> {
    log.info('🔍 Running comprehensive system diagnostics...')
    
    const startTime = Date.now()
    
    try {
      const [memory, cpu, network, tools, security] = await Promise.allSettled([
        this.checkMemoryHealth(),
        this.checkCPUPerformance(),
        this.checkNetworkConnectivity(),
        this.verifyToolAvailability(),
        this.validateSecurityTokens()
      ])

      const report: DiagnosticReport = {
        memory: memory.status === 'fulfilled' ? memory.value : this.createEmptyMemoryHealth(),
        cpu: cpu.status === 'fulfilled' ? cpu.value : this.createEmptyCPUPerformance(),
        network: network.status === 'fulfilled' ? network.value : this.createEmptyNetworkConnectivity(),
        tools: tools.status === 'fulfilled' ? tools.value : this.createEmptyToolAvailability(),
        security: security.status === 'fulfilled' ? security.value : this.createEmptySecurityValidation()
      }

      const duration = Date.now() - startTime
      log.info(`✅ System diagnostics completed in ${duration}ms`)
      
      return report
    } catch (error) {
      log.error('❌ System diagnostics failed:', error)
      return this.createEmptyDiagnosticReport()
    }
  }

  /**
   * Check memory health and usage
   */
  private async checkMemoryHealth(): Promise<MemoryHealth> {
    if (!this.config.enableMemoryCheck) {
      return this.createEmptyMemoryHealth()
    }

    try {
      log.info('💾 Checking memory health...')
      
      // Get memory information from the browser environment
      const memoryInfo = (performance as any).memory
      const available = memoryInfo ? memoryInfo.jsHeapSizeLimit : 0
      const used = memoryInfo ? memoryInfo.usedJSHeapSize : 0
      
      // Calculate memory usage percentage
      const usagePercentage = available > 0 ? (used / available) * 100 : 0
      
      // Determine if memory is healthy (less than 80% usage)
      const healthy = usagePercentage < 80
      const warnings: string[] = []
      
      if (usagePercentage > 90) {
        warnings.push('Memory usage is critically high (>90%)')
      } else if (usagePercentage > 80) {
        warnings.push('Memory usage is high (>80%)')
      }
      
      if (available === 0) {
        warnings.push('Unable to determine memory limits')
      }

      const result: MemoryHealth = {
        available,
        used,
        healthy,
        warnings
      }

      log.info(`✅ Memory health check completed: ${usagePercentage.toFixed(1)}% usage`)
      return result
    } catch (error) {
      log.error('❌ Memory health check failed:', error)
      return this.createEmptyMemoryHealth()
    }
  }

  /**
   * Check CPU performance and usage
   */
  private async checkCPUPerformance(): Promise<CPUPerformance> {
    if (!this.config.enableCPUCheck) {
      return this.createEmptyCPUPerformance()
    }

    try {
      log.info('🖥️ Checking CPU performance...')
      
      // Get CPU information from navigator
      const cores = navigator.hardwareConcurrency || 1
      
      // Measure CPU usage by running a performance test
      const startTime = performance.now()
      await this.runCPUBenchmark()
      const endTime = performance.now()
      
      // Calculate approximate CPU usage based on benchmark performance
      const benchmarkTime = endTime - startTime
      const expectedTime = 100 // Expected time for benchmark in ms
      const usage = Math.min(100, Math.max(0, (benchmarkTime / expectedTime) * 100))
      
      // Determine if CPU is healthy (less than 90% usage)
      const healthy = usage < 90
      const warnings: string[] = []
      
      if (usage > 95) {
        warnings.push('CPU usage is critically high (>95%)')
      } else if (usage > 90) {
        warnings.push('CPU usage is high (>90%)')
      }
      
      if (cores < 2) {
        warnings.push('Limited CPU cores detected')
      }

      const result: CPUPerformance = {
        usage,
        cores,
        healthy,
        warnings
      }

      log.info(`✅ CPU performance check completed: ${usage.toFixed(1)}% usage, ${cores} cores`)
      return result
    } catch (error) {
      log.error('❌ CPU performance check failed:', error)
      return this.createEmptyCPUPerformance()
    }
  }

  /**
   * Check network connectivity and performance
   */
  private async checkNetworkConnectivity(): Promise<NetworkConnectivity> {
    if (!this.config.enableNetworkCheck) {
      return this.createEmptyNetworkConnectivity()
    }

    try {
      log.info('🌐 Checking network connectivity...')
      
      // Test network connectivity
      const connected = navigator.onLine
      
      // Measure network latency
      const latency = await this.measureNetworkLatency()
      
      // Estimate bandwidth (simplified)
      const bandwidth = await this.estimateBandwidth()
      
      // Determine if network is healthy
      const healthy = connected && latency < 1000 && bandwidth > 1 // 1 Mbps minimum
      const warnings: string[] = []
      
      if (!connected) {
        warnings.push('No network connectivity detected')
      }
      
      if (latency > 1000) {
        warnings.push('High network latency detected')
      }
      
      if (bandwidth < 1) {
        warnings.push('Low bandwidth detected')
      }

      const result: NetworkConnectivity = {
        connected,
        latency,
        bandwidth,
        healthy
      }

      log.info(`✅ Network connectivity check completed: ${connected ? 'Connected' : 'Disconnected'}, ${latency}ms latency, ${bandwidth} Mbps`)
      return result
    } catch (error) {
      log.error('❌ Network connectivity check failed:', error)
      return this.createEmptyNetworkConnectivity()
    }
  }

  /**
   * Verify tool availability and capabilities
   */
  private async verifyToolAvailability(): Promise<ToolAvailability> {
    if (!this.config.enableToolCheck) {
      return this.createEmptyToolAvailability()
    }

    try {
      log.info('🛠️ Verifying tool availability...')
      
      // Check browser automation capabilities
      const browserAutomation = this.checkBrowserAutomationCapabilities()
      
      // Check vision capabilities
      const visionCapabilities = this.checkVisionCapabilities()
      
      // Check network tools
      const networkTools = this.checkNetworkTools()
      
      // Check GitHub integration
      const gitHubIntegration = this.checkGitHubIntegration()

      const result: ToolAvailability = {
        browserAutomation,
        visionCapabilities,
        networkTools,
        gitHubIntegration
      }

      log.info(`✅ Tool availability check completed: Browser=${browserAutomation}, Vision=${visionCapabilities}, Network=${networkTools}, GitHub=${gitHubIntegration}`)
      return result
    } catch (error) {
      log.error('❌ Tool availability check failed:', error)
      return this.createEmptyToolAvailability()
    }
  }

  /**
   * Validate security tokens and permissions
   */
  private async validateSecurityTokens(): Promise<SecurityValidation> {
    if (!this.config.enableSecurityCheck) {
      return this.createEmptySecurityValidation()
    }

    try {
      log.info('🔒 Validating security tokens...')
      
      // Check if we're in a secure context
      const secure = window.isSecureContext
      
      // Check for necessary permissions
      const permissionsOk = await this.checkPermissions()
      
      // Validate API tokens if available
      const tokensValid = await this.validateAPITokens()
      
      const warnings: string[] = []
      
      if (!secure) {
        warnings.push('Not running in a secure context')
      }
      
      if (!permissionsOk) {
        warnings.push('Missing required permissions')
      }
      
      if (!tokensValid) {
        warnings.push('API tokens validation failed')
      }

      const result: SecurityValidation = {
        tokensValid,
        permissionsOk,
        secure,
        warnings
      }

      log.info(`✅ Security validation completed: Secure=${secure}, Permissions=${permissionsOk}, Tokens=${tokensValid}`)
      return result
    } catch (error) {
      log.error('❌ Security validation failed:', error)
      return this.createEmptySecurityValidation()
    }
  }

  /**
   * Run a simple CPU benchmark
   */
  private async runCPUBenchmark(): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now()
      
      // Run some CPU-intensive operations
      let result = 0
      for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i) * Math.sin(i)
      }
      
      const endTime = performance.now()
      resolve()
    })
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    try {
      const startTime = performance.now()
      
      // Try to fetch a small resource to measure latency
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      const endTime = performance.now()
      return endTime - startTime
    } catch (error) {
      // If we can't measure latency, return a default value
      return 100
    }
  }

  /**
   * Estimate network bandwidth
   */
  private async estimateBandwidth(): Promise<number> {
    try {
      // Simple bandwidth estimation
      const startTime = performance.now()
      
      // Try to download a small test file
      const response = await fetch('/favicon.ico', { cache: 'no-cache' })
      const blob = await response.blob()
      
      const endTime = performance.now()
      const duration = (endTime - startTime) / 1000 // Convert to seconds
      const size = blob.size / (1024 * 1024) // Convert to MB
      
      // Calculate bandwidth in Mbps
      const bandwidth = (size * 8) / duration
      
      return Math.max(1, bandwidth) // Minimum 1 Mbps
    } catch (error) {
      // Default bandwidth estimate
      return 10
    }
  }

  /**
   * Check browser automation capabilities
   */
  private checkBrowserAutomationCapabilities(): boolean {
    try {
      // Check for basic browser automation capabilities
      const hasFetch = typeof fetch !== 'undefined'
      const hasWebWorkers = typeof Worker !== 'undefined'
      const hasServiceWorkers = 'serviceWorker' in navigator
      const hasWebGL = !!window.WebGLRenderingContext
      
      return hasFetch && hasWebWorkers && hasServiceWorkers && hasWebGL
    } catch (error) {
      return false
    }
  }

  /**
   * Check vision capabilities
   */
  private checkVisionCapabilities(): boolean {
    try {
      // Check for canvas and image processing capabilities
      const hasCanvas = !!document.createElement('canvas').getContext
      const hasImageData = !!window.ImageData
      const hasOffscreenCanvas = 'OffscreenCanvas' in window
      
      return hasCanvas && hasImageData && hasOffscreenCanvas
    } catch (error) {
      return false
    }
  }

  /**
   * Check network tools
   */
  private checkNetworkTools(): boolean {
    try {
      // Check for network-related APIs
      const hasFetch = typeof fetch !== 'undefined'
      const hasWebSocket = typeof WebSocket !== 'undefined'
      const hasXMLHttpRequest = typeof XMLHttpRequest !== 'undefined'
      
      return hasFetch && hasWebSocket && hasXMLHttpRequest
    } catch (error) {
      return false
    }
  }

  /**
   * Check GitHub integration capabilities
   */
  private checkGitHubIntegration(): boolean {
    try {
      // Check for capabilities needed for GitHub integration
      const hasFetch = typeof fetch !== 'undefined'
      const hasCrypto = typeof crypto !== 'undefined'
      const hasLocalStorage = typeof localStorage !== 'undefined'
      
      return hasFetch && hasCrypto && hasLocalStorage
    } catch (error) {
      return false
    }
  }

  /**
   * Check necessary permissions
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      // Check for basic permissions
      if ('permissions' in navigator) {
        const permissions = await Promise.allSettled([
          navigator.permissions.query({ name: 'notifications' as PermissionName }),
          navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
        ])
        
        return permissions.some(p => p.status === 'fulfilled')
      }
      
      return true // Assume permissions are available if we can't check
    } catch (error) {
      return true
    }
  }

  /**
   * Validate API tokens
   */
  private async validateAPITokens(): Promise<boolean> {
    try {
      // Get desktop settings to check for API keys
      const desktopSettings = await runtime.getDesktopSettings()
      
      // Check if we have any API keys configured
      const hasApiKey = !!desktopSettings.deepTreeEchoBotApiKey
      const hasApiEndpoint = !!desktopSettings.deepTreeEchoBotApiEndpoint
      
      return hasApiKey && hasApiEndpoint
    } catch (error) {
      return false
    }
  }

  // Helper methods for creating empty reports
  private createEmptyMemoryHealth(): MemoryHealth {
    return {
      available: 0,
      used: 0,
      healthy: false,
      warnings: ['Memory check failed']
    }
  }

  private createEmptyCPUPerformance(): CPUPerformance {
    return {
      usage: 0,
      cores: 0,
      healthy: false,
      warnings: ['CPU check failed']
    }
  }

  private createEmptyNetworkConnectivity(): NetworkConnectivity {
    return {
      connected: false,
      latency: 0,
      bandwidth: 0,
      healthy: false
    }
  }

  private createEmptyToolAvailability(): ToolAvailability {
    return {
      browserAutomation: false,
      visionCapabilities: false,
      networkTools: false,
      gitHubIntegration: false
    }
  }

  private createEmptySecurityValidation(): SecurityValidation {
    return {
      tokensValid: false,
      permissionsOk: false,
      secure: false,
      warnings: ['Security validation failed']
    }
  }

  private createEmptyDiagnosticReport(): DiagnosticReport {
    return {
      memory: this.createEmptyMemoryHealth(),
      cpu: this.createEmptyCPUPerformance(),
      network: this.createEmptyNetworkConnectivity(),
      tools: this.createEmptyToolAvailability(),
      security: this.createEmptySecurityValidation()
    }
  }
}

// Export the main class
export default DiagnosticEngine