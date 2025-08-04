import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('render/components/DeepTreeEchoBot/PlaywrightAutomation')

export interface PlaywrightAutomationOptions {
  enabled: boolean
  headless?: boolean
  defaultBrowser?: 'chromium' | 'firefox' | 'webkit'
  userAgent?: string
  timeout?: number
  viewport?: { width: number; height: number }
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  rank: number
}

export interface WebAutomationResult {
  success: boolean
  data?: any
  error?: string
  screenshot?: string
  processingTime: number
}

/**
 * PlaywrightAutomation - Provides real web automation capabilities for the Deep Tree Echo Bot
 * Uses Playwright for actual browser automation, web searches, and screenshots
 */
export class PlaywrightAutomation {
  private static instance: PlaywrightAutomation
  private options: PlaywrightAutomationOptions
  private isInitialized: boolean = false
  private browser: any = null
  private context: any = null
  private page: any = null
  
  private constructor(options: PlaywrightAutomationOptions) {
    this.options = {
      headless: true,
      defaultBrowser: 'chromium',
      timeout: 30000,
      viewport: { width: 1280, height: 720 },
      ...options,
      enabled: false // Default to disabled for safety
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PlaywrightAutomation {
    if (!PlaywrightAutomation.instance) {
      PlaywrightAutomation.instance = new PlaywrightAutomation({
        enabled: false, // Default to disabled
        headless: true,
        defaultBrowser: 'chromium'
      })
    }
    return PlaywrightAutomation.instance
  }
  
  /**
   * Initialize Playwright browser
   */
  async initialize(): Promise<boolean> {
    if (!this.options.enabled) {
      log.info('Web automation capabilities are disabled')
      return false
    }
    
    try {
      log.info('Initializing Playwright automation')
      
      // Dynamically import Playwright
      const { chromium, firefox, webkit } = await import('playwright')
      
      // Select browser based on configuration
      const browserType = this.options.defaultBrowser === 'firefox' ? firefox :
                         this.options.defaultBrowser === 'webkit' ? webkit : chromium
      
      // Launch browser
      this.browser = await browserType.launch({
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })
      
      // Create browser context
      this.context = await this.browser.newContext({
        userAgent: this.options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: this.options.viewport,
        timeout: this.options.timeout
      })
      
      // Create page
      this.page = await this.context.newPage()
      
      // Set default timeout
      this.page.setDefaultTimeout(this.options.timeout!)
      
      this.isInitialized = true
      log.info('Playwright automation initialized successfully')
      return true
    } catch (error) {
      log.error('Failed to initialize Playwright automation:', error)
      this.isInitialized = false
      return false
    }
  }
  
  /**
   * Ensure Playwright is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (!this.options.enabled) {
      return false
    }
    
    if (!this.isInitialized) {
      return await this.initialize()
    }
    
    return true
  }
  
  /**
   * Perform a web search using DuckDuckGo
   */
  async searchWeb(query: string, limit: number = 5): Promise<WebAutomationResult> {
    const startTime = performance.now()
    
    try {
      const initialized = await this.ensureInitialized()
      if (!initialized) {
        return {
          success: false,
          error: 'Web automation not initialized',
          processingTime: performance.now() - startTime
        }
      }
      
      log.info(`Performing web search for: ${query}`)
      
      // Navigate to DuckDuckGo
      await this.page.goto('https://duckduckgo.com')
      
      // Wait for search input and enter query
      await this.page.waitForSelector('#searchbox_input')
      await this.page.fill('#searchbox_input', query)
      await this.page.press('#searchbox_input', 'Enter')
      
      // Wait for results
      await this.page.waitForSelector('[data-testid="result"]', { timeout: 10000 })
      
      // Extract search results
      const results = await this.page.evaluate((limit: number) => {
        const resultElements = document.querySelectorAll('[data-testid="result"]')
        const searchResults: SearchResult[] = []
        
        for (let i = 0; i < Math.min(resultElements.length, limit); i++) {
          const element = resultElements[i] as HTMLElement
          const titleElement = element.querySelector('h2 a')
          const snippetElement = element.querySelector('[data-testid="snippet"]')
          
          if (titleElement) {
            const title = titleElement.textContent?.trim() || ''
            const url = (titleElement as HTMLAnchorElement).href || ''
            const snippet = snippetElement?.textContent?.trim() || ''
            
            searchResults.push({
              title,
              url,
              snippet,
              rank: i + 1
            })
          }
        }
        
        return searchResults
      }, limit)
      
      const processingTime = performance.now() - startTime
      
      return {
        success: true,
        data: results,
        processingTime: Math.round(processingTime)
      }
      
    } catch (error) {
      log.error('Error performing web search:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime
      }
    }
  }
  
  /**
   * Take a screenshot of a webpage
   */
  async takeScreenshot(url: string): Promise<WebAutomationResult> {
    const startTime = performance.now()
    
    try {
      const initialized = await this.ensureInitialized()
      if (!initialized) {
        return {
          success: false,
          error: 'Web automation not initialized',
          processingTime: performance.now() - startTime
        }
      }
      
      log.info(`Taking screenshot of: ${url}`)
      
      // Navigate to URL
      await this.page.goto(url, { waitUntil: 'networkidle' })
      
      // Wait for page to load
      await this.page.waitForLoadState('domcontentloaded')
      
      // Take screenshot
      const screenshot = await this.page.screenshot({
        fullPage: true,
        type: 'png'
      })
      
      // Convert to base64
      const base64Screenshot = screenshot.toString('base64')
      
      const processingTime = performance.now() - startTime
      
      return {
        success: true,
        data: {
          url,
          screenshot: `data:image/png;base64,${base64Screenshot}`,
          dimensions: await this.page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight
          }))
        },
        processingTime: Math.round(processingTime)
      }
      
    } catch (error) {
      log.error('Error taking screenshot:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime
      }
    }
  }
  
  /**
   * Extract information from a webpage
   */
  async extractPageInfo(url: string): Promise<WebAutomationResult> {
    const startTime = performance.now()
    
    try {
      const initialized = await this.ensureInitialized()
      if (!initialized) {
        return {
          success: false,
          error: 'Web automation not initialized',
          processingTime: performance.now() - startTime
        }
      }
      
      log.info(`Extracting page info from: ${url}`)
      
      // Navigate to URL
      await this.page.goto(url, { waitUntil: 'networkidle' })
      
      // Extract page information
      const pageInfo = await this.page.evaluate(() => {
        const title = document.title || ''
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
        
        // Extract main content
        const mainContent = document.querySelector('main') || 
                          document.querySelector('article') || 
                          document.querySelector('.content') ||
                          document.querySelector('body')
        
        const textContent = mainContent?.textContent?.trim() || ''
        
        // Extract links
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.textContent?.trim() || '',
          href: (a as HTMLAnchorElement).href
        })).slice(0, 10)
        
        // Extract images
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: (img as HTMLImageElement).src,
          alt: (img as HTMLImageElement).alt,
          title: (img as HTMLImageElement).title
        })).slice(0, 5)
        
        return {
          title,
          description,
          keywords,
          textContent: textContent.substring(0, 1000), // Limit content length
          links,
          images,
          url: window.location.href
        }
      })
      
      const processingTime = performance.now() - startTime
      
      return {
        success: true,
        data: pageInfo,
        processingTime: Math.round(processingTime)
      }
      
    } catch (error) {
      log.error('Error extracting page info:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime
      }
    }
  }
  
  /**
   * Navigate to a URL and wait for specific content
   */
  async navigateToUrl(url: string, waitForSelector?: string): Promise<WebAutomationResult> {
    const startTime = performance.now()
    
    try {
      const initialized = await this.ensureInitialized()
      if (!initialized) {
        return {
          success: false,
          error: 'Web automation not initialized',
          processingTime: performance.now() - startTime
        }
      }
      
      log.info(`Navigating to: ${url}`)
      
      // Navigate to URL
      await this.page.goto(url, { waitUntil: 'networkidle' })
      
      // Wait for specific selector if provided
      if (waitForSelector) {
        await this.page.waitForSelector(waitForSelector, { timeout: 10000 })
      }
      
      const processingTime = performance.now() - startTime
      
      return {
        success: true,
        data: {
          url: this.page.url(),
          title: await this.page.title()
        },
        processingTime: Math.round(processingTime)
      }
      
    } catch (error) {
      log.error('Error navigating to URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime
      }
    }
  }
  
  /**
   * Get system status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.options.enabled,
      browserRunning: this.browser !== null,
      pageReady: this.page !== null,
      currentUrl: this.page?.url() || null
    }
  }
  
  /**
   * Update configuration options
   */
  updateOptions(options: Partial<PlaywrightAutomationOptions>): void {
    this.options = { ...this.options, ...options }
    log.info('Playwright automation options updated:', this.options)
  }
  
  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }
      
      if (this.context) {
        await this.context.close()
        this.context = null
      }
      
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      
      this.isInitialized = false
      log.info('Playwright automation disposed')
    } catch (error) {
      log.error('Error disposing Playwright automation:', error)
    }
  }
} 