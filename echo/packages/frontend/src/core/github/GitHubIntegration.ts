/**
 * DeepTreeEcho GitHub Integration
 * 
 * Provides real GitHub API integration for repository management,
 * code analysis, and collaboration features.
 */

import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('render/core/github/GitHubIntegration')

export interface GitHubConfig {
  enabled: boolean
  accessToken?: string
  username?: string
  apiBaseUrl?: string
  rateLimitRemaining?: number
  rateLimitReset?: number
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  clone_url: string
  language: string
  stars: number
  forks: number
  updated_at: string
  private: boolean
  default_branch: string
}

export interface GitHubCommit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
  committer: {
    name: string
    email: string
    date: string
  }
  url: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  created_at: string
  updated_at: string
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    name: string
    color: string
  }>
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string
  state: 'open' | 'closed' | 'merged'
  created_at: string
  updated_at: string
  user: {
    login: string
    avatar_url: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
}

export interface GitHubIntegrationReport {
  isConnected: boolean
  repositories: GitHubRepository[]
  recentCommits: GitHubCommit[]
  openIssues: GitHubIssue[]
  openPullRequests: GitHubPullRequest[]
  rateLimit: {
    remaining: number
    reset: number
    limit: number
  }
  error?: string
}

/**
 * GitHub Integration Class
 * Provides real GitHub API integration for repository management and analysis
 */
export class GitHubIntegration {
  private static instance: GitHubIntegration
  private config: GitHubConfig
  private isInitialized: boolean = false
  private apiHeaders: Record<string, string> = {}
  
  private constructor(config: GitHubConfig) {
    this.config = {
      apiBaseUrl: 'https://api.github.com',
      ...config,
      enabled: false // Default to disabled for safety
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): GitHubIntegration {
    if (!GitHubIntegration.instance) {
      GitHubIntegration.instance = new GitHubIntegration({
        enabled: false
      })
    }
    return GitHubIntegration.instance
  }
  
  /**
   * Initialize GitHub integration
   */
  async initialize(): Promise<boolean> {
    if (!this.config.enabled) {
      log.info('GitHub integration is disabled')
      return false
    }
    
    if (!this.config.accessToken) {
      log.error('GitHub access token is required')
      return false
    }
    
    try {
      log.info('Initializing GitHub integration')
      
      // Set up API headers
      this.apiHeaders = {
        'Authorization': `token ${this.config.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DeepTreeEcho-GitHub-Integration'
      }
      
      // Test connection by fetching user info
      const userInfo = await this.fetchUserInfo()
      if (userInfo) {
        this.config.username = userInfo.login
        this.isInitialized = true
        log.info(`GitHub integration initialized for user: ${userInfo.login}`)
        return true
      } else {
        log.error('Failed to authenticate with GitHub')
        return false
      }
    } catch (error) {
      log.error('Failed to initialize GitHub integration:', error)
      return false
    }
  }
  
  /**
   * Make authenticated API request
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiBaseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.apiHeaders,
        ...options.headers
      }
    })
    
    // Update rate limit info
    this.config.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0')
    this.config.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset') || '0')
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    return response.json()
  }
  
  /**
   * Fetch user information
   */
  async fetchUserInfo(): Promise<any> {
    try {
      return await this.makeRequest('/user')
    } catch (error) {
      log.error('Failed to fetch user info:', error)
      return null
    }
  }
  
  /**
   * Get user repositories
   */
  async getRepositories(): Promise<GitHubRepository[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return []
      }
    }
    
    try {
      log.info('Fetching user repositories')
      const repos = await this.makeRequest('/user/repos?sort=updated&per_page=100')
      
      return repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updated_at: repo.updated_at,
        private: repo.private,
        default_branch: repo.default_branch
      }))
    } catch (error) {
      log.error('Failed to fetch repositories:', error)
      return []
    }
  }
  
  /**
   * Get recent commits for a repository
   */
  async getRecentCommits(owner: string, repo: string, branch: string = 'main'): Promise<GitHubCommit[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return []
      }
    }
    
    try {
      log.info(`Fetching recent commits for ${owner}/${repo}`)
      const commits = await this.makeRequest(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=20`)
      
      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          date: commit.commit.committer.date
        },
        url: commit.html_url
      }))
    } catch (error) {
      log.error(`Failed to fetch commits for ${owner}/${repo}:`, error)
      return []
    }
  }
  
  /**
   * Get open issues for a repository
   */
  async getOpenIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return []
      }
    }
    
    try {
      log.info(`Fetching open issues for ${owner}/${repo}`)
      const issues = await this.makeRequest(`/repos/${owner}/${repo}/issues?state=open&per_page=50`)
      
      return issues.map((issue: any) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        user: {
          login: issue.user.login,
          avatar_url: issue.user.avatar_url
        },
        labels: issue.labels.map((label: any) => ({
          name: label.name,
          color: label.color
        }))
      }))
    } catch (error) {
      log.error(`Failed to fetch issues for ${owner}/${repo}:`, error)
      return []
    }
  }
  
  /**
   * Get open pull requests for a repository
   */
  async getOpenPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return []
      }
    }
    
    try {
      log.info(`Fetching open pull requests for ${owner}/${repo}`)
      const pullRequests = await this.makeRequest(`/repos/${owner}/${repo}/pulls?state=open&per_page=50`)
      
      return pullRequests.map((pr: any) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        user: {
          login: pr.user.login,
          avatar_url: pr.user.avatar_url
        },
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha
        },
        base: {
          ref: pr.base.ref,
          sha: pr.base.sha
        }
      }))
    } catch (error) {
      log.error(`Failed to fetch pull requests for ${owner}/${repo}:`, error)
      return []
    }
  }
  
  /**
   * Create a new issue
   */
  async createIssue(owner: string, repo: string, title: string, body: string, labels: string[] = []): Promise<GitHubIssue | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return null
      }
    }
    
    try {
      log.info(`Creating issue in ${owner}/${repo}: ${title}`)
      const issue = await this.makeRequest(`/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          labels
        })
      })
      
      return {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        user: {
          login: issue.user.login,
          avatar_url: issue.user.avatar_url
        },
        labels: issue.labels.map((label: any) => ({
          name: label.name,
          color: label.color
        }))
      }
    } catch (error) {
      log.error(`Failed to create issue in ${owner}/${repo}:`, error)
      return null
    }
  }
  
  /**
   * Get repository content
   */
  async getRepositoryContent(owner: string, repo: string, path: string = ''): Promise<any> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return null
      }
    }
    
    try {
      log.info(`Fetching content from ${owner}/${repo}/${path}`)
      return await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`)
    } catch (error) {
      log.error(`Failed to fetch content from ${owner}/${repo}/${path}:`, error)
      return null
    }
  }
  
  /**
   * Search repositories
   */
  async searchRepositories(query: string, sort: 'stars' | 'forks' | 'updated' = 'stars'): Promise<GitHubRepository[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return []
      }
    }
    
    try {
      log.info(`Searching repositories: ${query}`)
      const searchResults = await this.makeRequest(`/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=30`)
      
      return searchResults.items.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updated_at: repo.updated_at,
        private: repo.private,
        default_branch: repo.default_branch
      }))
    } catch (error) {
      log.error(`Failed to search repositories:`, error)
      return []
    }
  }
  
  /**
   * Get integration status and report
   */
  async getIntegrationReport(): Promise<GitHubIntegrationReport> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return {
          isConnected: false,
          repositories: [],
          recentCommits: [],
          openIssues: [],
          openPullRequests: [],
          rateLimit: {
            remaining: 0,
            reset: 0,
            limit: 0
          },
          error: 'GitHub integration not initialized'
        }
      }
    }
    
    try {
      const repositories = await this.getRepositories()
      const recentCommits: GitHubCommit[] = []
      const openIssues: GitHubIssue[] = []
      const openPullRequests: GitHubPullRequest[] = []
      
      // Get recent activity from first few repositories
      for (const repo of repositories.slice(0, 3)) {
        const [owner, repoName] = repo.full_name.split('/')
        
        try {
          const commits = await this.getRecentCommits(owner, repoName)
          recentCommits.push(...commits.slice(0, 5))
          
          const issues = await this.getOpenIssues(owner, repoName)
          openIssues.push(...issues.slice(0, 5))
          
          const pullRequests = await this.getOpenPullRequests(owner, repoName)
          openPullRequests.push(...pullRequests.slice(0, 5))
        } catch (error) {
          log.warn(`Failed to fetch activity for ${repo.full_name}:`, error)
        }
      }
      
      return {
        isConnected: true,
        repositories,
        recentCommits: recentCommits.slice(0, 20),
        openIssues: openIssues.slice(0, 20),
        openPullRequests: openPullRequests.slice(0, 20),
        rateLimit: {
          remaining: this.config.rateLimitRemaining || 0,
          reset: this.config.rateLimitReset || 0,
          limit: 5000
        }
      }
    } catch (error) {
      log.error('Failed to generate integration report:', error)
      return {
        isConnected: false,
        repositories: [],
        recentCommits: [],
        openIssues: [],
        openPullRequests: [],
        rateLimit: {
          remaining: 0,
          reset: 0,
          limit: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<GitHubConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (config.accessToken) {
      this.apiHeaders['Authorization'] = `token ${config.accessToken}`
    }
    
    log.info('GitHub integration config updated')
  }
  
  /**
   * Get current configuration
   */
  getConfig(): GitHubConfig {
    return { ...this.config }
  }
  
  /**
   * Check if integration is enabled and initialized
   */
  isReady(): boolean {
    return this.config.enabled && this.isInitialized
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.isInitialized = false
    this.apiHeaders = {}
    log.info('GitHub integration disposed')
  }
}