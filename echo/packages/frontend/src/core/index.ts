/**
 * DeepTreeEcho Core System
 * 
 * This module exports all core components for the DeepTreeEcho system
 */

// Export autonomy system
export * from './autonomy'

// Export startup system
export { AutonomousStartup } from './startup/AutonomousStartup'
export type { StartupConfig, StartupReport } from './startup/AutonomousStartup'

// Export diagnostic engine
export { DiagnosticEngine } from './diagnostics/DiagnosticEngine'
export type { DiagnosticConfig } from './diagnostics/DiagnosticEngine'

// Export resource manager
export { ResourceManager } from './resources/ResourceManager'
export type { ResourceConfig, MemoryPool, ToolRegistry, APIEndpoint } from './resources/ResourceManager'

// Export dynamic prompt engine
export { DynamicPromptEngine } from './prompts/DynamicPromptEngine'
export type { PromptConfig, SystemContext, PromptTemplate, PersonalityProfile, ContextAnalysis } from './prompts/DynamicPromptEngine'

// Export browser integration
export { BrowserIntegration } from './browser/BrowserIntegration'
export type { BrowserConfig, ScreenResolution, VisionCalibration, WebPageAnalysis } from './browser/BrowserIntegration'

// Export network manager
export { NetworkManager } from './network/NetworkManager'
export type { NetworkConfig, NetworkStatus, SecurityToken, ProxyConfig, GitHubConfig } from './network/NetworkManager'

// Main startup system
export { AutonomousStartup as DeepTreeEchoStartup } from './startup/AutonomousStartup'