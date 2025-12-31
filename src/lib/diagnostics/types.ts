// @ts-nocheck
// Diagnostics System Types

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'
export type ServiceStatus = 'connected' | 'error' | 'not_configured' | 'checking'

export interface APIHealthCheck {
  name: string
  status: ServiceStatus
  latency?: number
  error?: string
  envKey: string
  category: 'ai' | 'search' | 'database' | 'auth' | 'media' | 'payments' | 'hosting' | 'other'
}

export interface DatabaseHealthCheck {
  table: string
  status: 'ok' | 'error' | 'empty'
  rowCount?: number
  error?: string
}

export interface StorageHealthCheck {
  bucket: string
  status: 'ok' | 'error' | 'not_found'
  fileCount?: number
  totalSize?: number
  error?: string
}

export interface EnvHealthCheck {
  name: string
  category: string
  configured: boolean
  required: boolean
  masked?: string // First 4 chars + ***
}

export interface SystemHealthResult {
  timestamp: string
  overall: HealthStatus
  apis: APIHealthCheck[]
  database: DatabaseHealthCheck[]
  storage: StorageHealthCheck[]
  environment: EnvHealthCheck[]
  duration_ms: number
  issues_count: number
  warnings_count: number
}

export interface DiagnosticIssue {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'code' | 'config' | 'database' | 'api' | 'security' | 'performance'
  title: string
  description: string
  location?: string
  lineNumber?: number
  suggestion?: string
}

export interface ProposedFix {
  id: string
  type: 'replace' | 'insert' | 'delete' | 'overwrite' | 'create'
  category: 'code' | 'env' | 'database' | 'config'
  description: string
  risk: 'low' | 'medium' | 'high'
  confidence: number
  filePath: string
  searchText?: string
  replaceText?: string
  content?: string
  lineNumber?: number
  lineCount?: number
  estimatedImpact: string
}

export interface FixChange {
  file?: string
  action: 'modify' | 'create' | 'delete' | 'execute'
  description: string
  content?: string
  originalContent?: string
  sql?: string
}

export interface FixResult {
  success: boolean
  message?: string
  error?: string
  rollbackData?: RollbackData
  duration_ms: number
}

export interface RollbackData {
  filePath: string
  originalContent: string | null
  fixType: string
  appliedAt: string
}

export interface AnalysisResult {
  summary: string
  issues: DiagnosticIssue[]
  suggestions: string[]
  proposedFixes: ProposedFix[]
  confidence: number
  aiProvider?: string
  aiModel?: string
  tokensUsed?: number
}

export interface CodeAnalysisRequest {
  scope: 'full' | 'specific' | 'pattern'
  files?: string[]
  pattern?: string
  analysisType: 'errors' | 'security' | 'performance' | 'all'
}

export interface IssueReportRequest {
  description: string
  location?: string
  expectedBehavior?: string
  actualBehavior?: string
  stepsToReproduce?: string
}
