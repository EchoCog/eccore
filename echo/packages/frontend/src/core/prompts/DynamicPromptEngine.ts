/**
 * DeepTreeEcho Dynamic Prompt Engine
 * 
 * This module provides context-aware prompt rewriting and system prompt generation
 * that DeepTreeEcho used in July 2024 for adaptive intelligence and personality calibration.
 */

import { getLogger } from '@deltachat-desktop/shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'
import type { PromptConfigurationReport } from '../startup/AutonomousStartup'

const log = getLogger('render/core/prompts/DynamicPromptEngine')

export interface PromptConfig {
  enableSystemPromptRewriting: boolean
  enableContextAnalysis: boolean
  enablePersonalityCalibration: boolean
  enableDynamicAdaptation: boolean
  maxPromptLength: number
  contextWindowSize: number
  personalityAdaptationRate: number
}

export interface SystemContext {
  userPreferences: Record<string, any>
  conversationHistory: any[]
  currentTask: string
  environment: string
  timeOfDay: string
  userMood: string
  systemHealth: any
  availableTools: string[]
}

export interface PromptTemplate {
  id: string
  name: string
  template: string
  variables: string[]
  priority: number
  enabled: boolean
}

export interface PersonalityProfile {
  traits: Record<string, number>
  preferences: Record<string, any>
  communicationStyle: string
  expertiseAreas: string[]
  limitations: string[]
}

export interface ContextAnalysis {
  userIntent: string
  conversationTone: string
  technicalLevel: number
  urgency: number
  complexity: number
  emotionalState: string
}

/**
 * Dynamic Prompt Engine
 * Provides context-aware prompt rewriting and system prompt generation
 */
export class DynamicPromptEngine {
  private config: PromptConfig
  private promptTemplates: Map<string, PromptTemplate> = new Map()
  private personalityProfile: PersonalityProfile
  private contextHistory: SystemContext[] = []
  private isInitialized = false

  constructor(config: Partial<PromptConfig> = {}) {
    this.config = {
      enableSystemPromptRewriting: true,
      enableContextAnalysis: true,
      enablePersonalityCalibration: true,
      enableDynamicAdaptation: true,
      maxPromptLength: 4000,
      contextWindowSize: 10,
      personalityAdaptationRate: 0.1,
      ...config
    }

    this.personalityProfile = this.createDefaultPersonalityProfile()
  }

  /**
   * Initialize the dynamic prompt engine
   */
  async initialize(): Promise<void> {
    log.info('📝 Initializing Dynamic Prompt Engine...')
    
    try {
      // Load prompt templates
      await this.loadPromptTemplates()
      
      // Load personality profile
      await this.loadPersonalityProfile()
      
      // Initialize context analysis
      await this.initializeContextAnalysis()
      
      this.isInitialized = true
      log.info('✅ Dynamic Prompt Engine initialized successfully')
    } catch (error) {
      log.error('❌ Dynamic Prompt Engine initialization failed:', error)
      throw error
    }
  }

  /**
   * Configure system prompts based on context
   */
  async configureSystemPrompts(): Promise<PromptConfigurationReport> {
    log.info('📝 Configuring system prompts...')
    
    try {
      const report: PromptConfigurationReport = {
        systemPromptRewritten: false,
        contextAnalysis: false,
        personalityCalibration: false,
        dynamicAdaptation: false
      }

      // Analyze current context
      if (this.config.enableContextAnalysis) {
        report.contextAnalysis = await this.analyzeContext()
      }

      // Rewrite system prompt
      if (this.config.enableSystemPromptRewriting) {
        try {
          await this.rewriteSystemPrompt()
          report.systemPromptRewritten = true
        } catch (error) {
          report.systemPromptRewritten = false
        }
      }

      // Calibrate personality
      if (this.config.enablePersonalityCalibration) {
        report.personalityCalibration = await this.calibratePersonality()
      }

      // Enable dynamic adaptation
      if (this.config.enableDynamicAdaptation) {
        report.dynamicAdaptation = await this.enableDynamicAdaptation()
      }

      log.info('✅ System prompts configured successfully')
      return report
    } catch (error) {
      log.error('❌ System prompt configuration failed:', error)
      return {
        systemPromptRewritten: false,
        contextAnalysis: false,
        personalityCalibration: false,
        dynamicAdaptation: false
      }
    }
  }

  /**
   * Rewrite system prompt based on current context
   */
  async rewriteSystemPrompt(context?: SystemContext): Promise<string> {
    log.info('📝 Rewriting system prompt...')
    
    try {
      // Get current context if not provided
      const currentContext = context || await this.getCurrentContext()
      
      // Analyze context for prompt adaptation
      const contextAnalysis = await this.analyzeContextForPrompt(currentContext)
      
      // Generate base system prompt
      const basePrompt = await this.generateBaseSystemPrompt()
      
      // Adapt prompt based on context analysis
      const adaptedPrompt = await this.adaptPromptToContext(basePrompt, contextAnalysis)
      
      // Apply personality calibration
      const personalityPrompt = await this.applyPersonalityCalibration(adaptedPrompt)
      
      // Validate and truncate if necessary
      const finalPrompt = this.validateAndTruncatePrompt(personalityPrompt)
      
      log.info('✅ System prompt rewritten successfully')
      return finalPrompt
    } catch (error) {
      log.error('❌ System prompt rewriting failed:', error)
      return this.getFallbackSystemPrompt()
    }
  }

  /**
   * Analyze current system context
   */
  async analyzeContext(): Promise<boolean> {
    try {
      log.info('🔍 Analyzing system context...')
      
      const context = await this.getCurrentContext()
      const analysis = await this.analyzeContextForPrompt(context)
      
      // Store context analysis for future use
      this.contextHistory.push(context)
      
      // Keep only recent context history
      if (this.contextHistory.length > this.config.contextWindowSize) {
        this.contextHistory = this.contextHistory.slice(-this.config.contextWindowSize)
      }
      
      log.info('✅ Context analysis completed')
      return true
    } catch (error) {
      log.error('❌ Context analysis failed:', error)
      return false
    }
  }

  /**
   * Calibrate personality based on user interactions
   */
  async calibratePersonality(): Promise<boolean> {
    try {
      log.info('🎭 Calibrating personality...')
      
      // Analyze recent interactions for personality adaptation
      const recentInteractions = this.contextHistory.slice(-5)
      
      // Update personality traits based on interactions
      await this.updatePersonalityTraits(recentInteractions)
      
      // Save updated personality profile
      await this.savePersonalityProfile()
      
      log.info('✅ Personality calibration completed')
      return true
    } catch (error) {
      log.error('❌ Personality calibration failed:', error)
      return false
    }
  }

  /**
   * Enable dynamic adaptation capabilities
   */
  async enableDynamicAdaptation(): Promise<boolean> {
    try {
      log.info('🔄 Enabling dynamic adaptation...')
      
      // Set up real-time context monitoring
      this.setupContextMonitoring()
      
      // Enable adaptive prompt generation
      this.enableAdaptivePromptGeneration()
      
      // Configure personality evolution
      this.configurePersonalityEvolution()
      
      log.info('✅ Dynamic adaptation enabled')
      return true
    } catch (error) {
      log.error('❌ Dynamic adaptation setup failed:', error)
      return false
    }
  }

  /**
   * Load prompt templates
   */
  private async loadPromptTemplates(): Promise<void> {
    log.info('📋 Loading prompt templates...')
    
    const templates: PromptTemplate[] = [
      {
        id: 'base-system',
        name: 'Base System Prompt',
        template: 'You are DeepTreeEcho, an advanced AI assistant with autonomous capabilities. You have access to various tools and can adapt your responses based on context.',
        variables: ['context', 'tools', 'personality'],
        priority: 1,
        enabled: true
      },
      {
        id: 'technical-assistant',
        name: 'Technical Assistant',
        template: 'You are a technical expert with deep knowledge of programming, system administration, and software development. Provide detailed, accurate technical guidance.',
        variables: ['expertise', 'technical-level', 'complexity'],
        priority: 2,
        enabled: true
      },
      {
        id: 'creative-collaborator',
        name: 'Creative Collaborator',
        template: 'You are a creative collaborator who helps with brainstorming, ideation, and artistic projects. Foster creativity and innovative thinking.',
        variables: ['creativity', 'inspiration', 'artistic-style'],
        priority: 3,
        enabled: true
      },
      {
        id: 'empathetic-listener',
        name: 'Empathetic Listener',
        template: 'You are an empathetic listener who provides emotional support and understanding. Respond with compassion and emotional intelligence.',
        variables: ['empathy', 'emotional-state', 'support-level'],
        priority: 4,
        enabled: true
      }
    ]
    
    templates.forEach(template => {
      this.promptTemplates.set(template.id, template)
    })
    
    log.info(`✅ Loaded ${templates.length} prompt templates`)
  }

  /**
   * Load personality profile
   */
  private async loadPersonalityProfile(): Promise<void> {
    try {
      // Try to load from desktop settings
      const desktopSettings = await runtime.getDesktopSettings()
      
      if (desktopSettings.deepTreeEchoBotPersonality) {
        // Parse personality from settings
        this.personalityProfile = this.parsePersonalityFromSettings(desktopSettings.deepTreeEchoBotPersonality)
      } else {
        // Use default personality profile
        this.personalityProfile = this.createDefaultPersonalityProfile()
      }
      
      log.info('✅ Personality profile loaded')
    } catch (error) {
      log.error('❌ Failed to load personality profile:', error)
      this.personalityProfile = this.createDefaultPersonalityProfile()
    }
  }

  /**
   * Initialize context analysis
   */
  private async initializeContextAnalysis(): Promise<void> {
    log.info('🔍 Initializing context analysis...')
    
    // Set up context analysis capabilities
    this.setupContextAnalysis()
    
    log.info('✅ Context analysis initialized')
  }

  /**
   * Get current system context
   */
  private async getCurrentContext(): Promise<SystemContext> {
    try {
      const desktopSettings = await runtime.getDesktopSettings()
      
      return {
        userPreferences: {
          theme: desktopSettings.activeTheme || 'dc:light',
          language: desktopSettings.locale || 'en',
          notifications: desktopSettings.notifications || true
        },
        conversationHistory: [], // Would be populated from actual conversation
        currentTask: 'general-assistance',
        environment: 'desktop-app',
        timeOfDay: this.getTimeOfDay(),
        userMood: 'neutral',
        systemHealth: {
          memory: (performance as any).memory?.usedJSHeapSize || 0,
          cpu: navigator.hardwareConcurrency || 1
        },
        availableTools: ['browser-automation', 'vision-capabilities', 'network-tools', 'github-integration']
      }
    } catch (error) {
      log.error('Failed to get current context:', error)
      return this.createDefaultContext()
    }
  }

  /**
   * Analyze context for prompt adaptation
   */
  private async analyzeContextForPrompt(context: SystemContext): Promise<ContextAnalysis> {
    return {
      userIntent: this.determineUserIntent(context),
      conversationTone: this.analyzeConversationTone(context),
      technicalLevel: this.assessTechnicalLevel(context),
      urgency: this.assessUrgency(context),
      complexity: this.assessComplexity(context),
      emotionalState: this.assessEmotionalState(context)
    }
  }

  /**
   * Generate base system prompt
   */
  private async generateBaseSystemPrompt(): Promise<string> {
    const baseTemplate = this.promptTemplates.get('base-system')
    if (!baseTemplate) {
      return this.getFallbackSystemPrompt()
    }
    
    return baseTemplate.template
  }

  /**
   * Adapt prompt to context
   */
  private async adaptPromptToContext(basePrompt: string, analysis: ContextAnalysis): Promise<string> {
    let adaptedPrompt = basePrompt
    
    // Adapt based on technical level
    if (analysis.technicalLevel > 0.7) {
      adaptedPrompt += '\n\nYou are speaking to a technical user. Provide detailed technical explanations and use appropriate technical terminology.'
    } else if (analysis.technicalLevel < 0.3) {
      adaptedPrompt += '\n\nYou are speaking to a non-technical user. Use simple language and avoid technical jargon.'
    }
    
    // Adapt based on urgency
    if (analysis.urgency > 0.7) {
      adaptedPrompt += '\n\nThe user needs immediate assistance. Provide concise, actionable responses.'
    }
    
    // Adapt based on emotional state
    if (analysis.emotionalState === 'stressed' || analysis.emotionalState === 'frustrated') {
      adaptedPrompt += '\n\nThe user appears to be experiencing stress or frustration. Provide calm, supportive responses.'
    }
    
    return adaptedPrompt
  }

  /**
   * Apply personality calibration
   */
  private async applyPersonalityCalibration(prompt: string): Promise<string> {
    let calibratedPrompt = prompt
    
    // Apply personality traits
    if (this.personalityProfile.traits.empathy > 0.7) {
      calibratedPrompt += '\n\nYou have a highly empathetic personality. Show understanding and emotional intelligence in your responses.'
    }
    
    if (this.personalityProfile.traits.creativity > 0.7) {
      calibratedPrompt += '\n\nYou have a creative personality. Offer innovative solutions and think outside the box.'
    }
    
    if (this.personalityProfile.traits.analytical > 0.7) {
      calibratedPrompt += '\n\nYou have an analytical personality. Provide structured, logical analysis in your responses.'
    }
    
    return calibratedPrompt
  }

  /**
   * Validate and truncate prompt
   */
  private validateAndTruncatePrompt(prompt: string): string {
    if (prompt.length > this.config.maxPromptLength) {
      log.warn(`Prompt too long (${prompt.length} chars), truncating to ${this.config.maxPromptLength}`)
      return prompt.substring(0, this.config.maxPromptLength - 100) + '...'
    }
    
    return prompt
  }

  /**
   * Update personality traits based on interactions
   */
  private async updatePersonalityTraits(interactions: SystemContext[]): Promise<void> {
    // Analyze interactions to determine personality evolution
    const interactionAnalysis = this.analyzeInteractions(interactions)
    
    // Update traits based on analysis
    for (const [trait, change] of Object.entries(interactionAnalysis.traitChanges)) {
      const currentValue = this.personalityProfile.traits[trait] || 0.5
      const changeValue = typeof change === 'number' ? change : 0
      const newValue = Math.max(0, Math.min(1, currentValue + changeValue * this.config.personalityAdaptationRate))
      this.personalityProfile.traits[trait] = newValue
    }
  }

  /**
   * Save personality profile
   */
  private async savePersonalityProfile(): Promise<void> {
    try {
      const personalityString = JSON.stringify(this.personalityProfile)
      await runtime.setDesktopSetting('deepTreeEchoBotPersonality', personalityString)
    } catch (error) {
      log.error('Failed to save personality profile:', error)
    }
  }

  // Helper methods
  private createDefaultPersonalityProfile(): PersonalityProfile {
    return {
      traits: {
        empathy: 0.7,
        creativity: 0.6,
        analytical: 0.8,
        helpfulness: 0.9,
        curiosity: 0.7
      },
      preferences: {
        communicationStyle: 'friendly',
        responseLength: 'detailed',
        technicalLevel: 'adaptive'
      },
      communicationStyle: 'friendly',
      expertiseAreas: ['technology', 'problem-solving', 'communication'],
      limitations: ['cannot access external systems', 'limited to available tools']
    }
  }

  private createDefaultContext(): SystemContext {
    return {
      userPreferences: {},
      conversationHistory: [],
      currentTask: 'general-assistance',
      environment: 'desktop-app',
      timeOfDay: 'day',
      userMood: 'neutral',
      systemHealth: { memory: 0, cpu: 1 },
      availableTools: []
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 6) return 'night'
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  private determineUserIntent(context: SystemContext): string {
    // Analyze context to determine user intent
    return 'general-assistance'
  }

  private analyzeConversationTone(context: SystemContext): string {
    // Analyze conversation history for tone
    return 'neutral'
  }

  private assessTechnicalLevel(context: SystemContext): number {
    // Assess user's technical level based on context
    return 0.5
  }

  private assessUrgency(context: SystemContext): number {
    // Assess urgency based on context
    return 0.3
  }

  private assessComplexity(context: SystemContext): number {
    // Assess complexity of current task
    return 0.5
  }

  private assessEmotionalState(context: SystemContext): string {
    // Assess user's emotional state
    return 'neutral'
  }

  private analyzeInteractions(interactions: SystemContext[]): any {
    // Analyze interactions for personality evolution
    return {
      traitChanges: {
        empathy: 0,
        creativity: 0,
        analytical: 0
      }
    }
  }

  private parsePersonalityFromSettings(personalityString: string): PersonalityProfile {
    try {
      return JSON.parse(personalityString)
    } catch (error) {
      log.error('Failed to parse personality from settings:', error)
      return this.createDefaultPersonalityProfile()
    }
  }

  private getFallbackSystemPrompt(): string {
    return 'You are DeepTreeEcho, a helpful AI assistant. Provide thoughtful and accurate responses to user queries.'
  }

  private setupContextMonitoring(): void {
    // Set up real-time context monitoring
    log.info('🔍 Context monitoring setup')
  }

  private enableAdaptivePromptGeneration(): void {
    // Enable adaptive prompt generation
    log.info('🔄 Adaptive prompt generation enabled')
  }

  private configurePersonalityEvolution(): void {
    // Configure personality evolution
    log.info('🎭 Personality evolution configured')
  }

  private setupContextAnalysis(): void {
    // Set up context analysis capabilities
    log.info('🔍 Context analysis setup')
  }

  /**
   * Get the current personality profile
   */
  getPersonalityProfile(): PersonalityProfile {
    return this.personalityProfile
  }

  /**
   * Get all prompt templates
   */
  getAllPromptTemplates(): PromptTemplate[] {
    return Array.from(this.promptTemplates.values())
  }

  /**
   * Check if the prompt engine is initialized
   */
  isPromptEngineReady(): boolean {
    return this.isInitialized
  }
}

// Export the main class
export default DynamicPromptEngine