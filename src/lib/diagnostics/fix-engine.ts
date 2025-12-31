// =============================================================================
// FIX ENGINE - Applies fixes with rollback capability
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import type { ProposedFix, FixResult, RollbackData } from './types'

// Security: Allowed directories for modifications
const ALLOWED_DIRECTORIES = ['src', 'public', 'scripts', 'components']

// Security: Files that cannot be modified
const FORBIDDEN_FILES = [
  '.env.local',
  '.env',
  '.env.production',
  'next.config.ts',
  'next.config.js',
  'middleware.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
]

// Security: File patterns that cannot be modified
const FORBIDDEN_PATTERNS = [
  /\.env/,
  /secrets?\./i,
  /credentials?\./i,
  /\.pem$/,
  /\.key$/,
]

/**
 * Validates that a file path is safe to modify
 */
export function isPathSafe(filePath: string): { safe: boolean; reason?: string } {
  // Normalize path
  const normalizedPath = filePath.replace(/\\/g, '/')

  // Check for path traversal attempts
  if (normalizedPath.includes('..')) {
    return { safe: false, reason: 'Path traversal not allowed' }
  }

  // Check if in allowed directory
  const inAllowedDir = ALLOWED_DIRECTORIES.some(dir =>
    normalizedPath.startsWith(`${dir}/`) || normalizedPath === dir
  )

  if (!inAllowedDir) {
    return { safe: false, reason: `File must be in allowed directories: ${ALLOWED_DIRECTORIES.join(', ')}` }
  }

  // Check forbidden files
  const filename = normalizedPath.split('/').pop() || ''
  if (FORBIDDEN_FILES.includes(filename)) {
    return { safe: false, reason: `Cannot modify protected file: ${filename}` }
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return { safe: false, reason: `File matches forbidden pattern` }
    }
  }

  return { safe: true }
}

/**
 * Gets the project root directory
 */
function getProjectRoot(): string {
  // In development, use process.cwd()
  // In production, this would need to be configured
  return process.cwd()
}

/**
 * Reads a file safely
 */
export async function readFileSafe(relativePath: string): Promise<{ content: string | null; error?: string }> {
  const pathCheck = isPathSafe(relativePath)
  if (!pathCheck.safe) {
    return { content: null, error: pathCheck.reason }
  }

  const fullPath = join(getProjectRoot(), relativePath)

  try {
    if (!existsSync(fullPath)) {
      return { content: null, error: 'File does not exist' }
    }
    const content = await readFile(fullPath, 'utf-8')
    return { content }
  } catch (error) {
    return { content: null, error: error instanceof Error ? error.message : 'Failed to read file' }
  }
}

/**
 * Preview a fix - shows what changes would be made
 */
export async function previewFix(fix: ProposedFix): Promise<{
  success: boolean
  preview?: {
    filePath: string
    originalContent: string
    newContent: string
    diff: string[]
  }
  error?: string
}> {
  // Validate path
  const pathCheck = isPathSafe(fix.filePath)
  if (!pathCheck.safe) {
    return { success: false, error: pathCheck.reason }
  }

  // Read current content
  const { content: originalContent, error: readError } = await readFileSafe(fix.filePath)
  if (readError || originalContent === null) {
    // For new files, originalContent is empty
    if (fix.type === 'create') {
      return {
        success: true,
        preview: {
          filePath: fix.filePath,
          originalContent: '',
          newContent: fix.content || '',
          diff: [`+ ${(fix.content || '').split('\n').length} new lines`],
        },
      }
    }
    return { success: false, error: readError || 'Could not read file' }
  }

  // Generate new content based on fix type
  let newContent = originalContent

  if (fix.type === 'replace' && fix.searchText && fix.replaceText !== undefined) {
    newContent = originalContent.replace(fix.searchText, fix.replaceText)
  } else if (fix.type === 'insert' && fix.content && fix.lineNumber !== undefined) {
    const lines = originalContent.split('\n')
    lines.splice(fix.lineNumber - 1, 0, fix.content)
    newContent = lines.join('\n')
  } else if (fix.type === 'delete' && fix.lineNumber !== undefined) {
    const lines = originalContent.split('\n')
    const deleteCount = fix.lineCount || 1
    lines.splice(fix.lineNumber - 1, deleteCount)
    newContent = lines.join('\n')
  } else if (fix.type === 'overwrite' && fix.content) {
    newContent = fix.content
  }

  // Generate simple diff
  const originalLines = originalContent.split('\n')
  const newLines = newContent.split('\n')
  const diff: string[] = []

  const maxLines = Math.max(originalLines.length, newLines.length)
  for (let i = 0; i < maxLines; i++) {
    if (originalLines[i] !== newLines[i]) {
      if (originalLines[i]) {
        diff.push(`- L${i + 1}: ${originalLines[i].substring(0, 80)}${originalLines[i].length > 80 ? '...' : ''}`)
      }
      if (newLines[i]) {
        diff.push(`+ L${i + 1}: ${newLines[i].substring(0, 80)}${newLines[i].length > 80 ? '...' : ''}`)
      }
    }
  }

  return {
    success: true,
    preview: {
      filePath: fix.filePath,
      originalContent,
      newContent,
      diff: diff.length > 0 ? diff : ['No changes detected'],
    },
  }
}

/**
 * Apply a fix with rollback capability
 */
export async function applyFix(
  fix: ProposedFix,
  userId: string,
  diagnosticLogId?: string
): Promise<FixResult> {
  const startTime = Date.now()

  // Validate path
  const pathCheck = isPathSafe(fix.filePath)
  if (!pathCheck.safe) {
    return {
      success: false,
      error: pathCheck.reason,
      duration_ms: Date.now() - startTime,
    }
  }

  const fullPath = join(getProjectRoot(), fix.filePath)

  // Read original content for rollback
  let originalContent: string | null = null
  const fileExists = existsSync(fullPath)

  if (fileExists) {
    const { content, error } = await readFileSafe(fix.filePath)
    if (error && fix.type !== 'create') {
      return {
        success: false,
        error: `Cannot read file: ${error}`,
        duration_ms: Date.now() - startTime,
      }
    }
    originalContent = content
  }

  // Generate new content
  let newContent: string

  if (fix.type === 'replace' && fix.searchText && fix.replaceText !== undefined && originalContent) {
    newContent = originalContent.replace(fix.searchText, fix.replaceText)
  } else if (fix.type === 'insert' && fix.content && fix.lineNumber !== undefined && originalContent) {
    const lines = originalContent.split('\n')
    lines.splice(fix.lineNumber - 1, 0, fix.content)
    newContent = lines.join('\n')
  } else if (fix.type === 'delete' && fix.lineNumber !== undefined && originalContent) {
    const lines = originalContent.split('\n')
    const deleteCount = fix.lineCount || 1
    lines.splice(fix.lineNumber - 1, deleteCount)
    newContent = lines.join('\n')
  } else if (fix.type === 'overwrite' && fix.content) {
    newContent = fix.content
  } else if (fix.type === 'create' && fix.content) {
    newContent = fix.content
  } else {
    return {
      success: false,
      error: 'Invalid fix type or missing required parameters',
      duration_ms: Date.now() - startTime,
    }
  }

  // Store rollback data in database
  const rollbackData: RollbackData = {
    filePath: fix.filePath,
    originalContent,
    fixType: fix.type,
    appliedAt: new Date().toISOString(),
  }

  const supabase = await createClient()

  try {
    // Create directory if needed
    const dir = dirname(fullPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    // Write new content
    await writeFile(fullPath, newContent, 'utf-8')

    // Log the fix application
    if (diagnosticLogId) {
      await (supabase.from('diagnostic_logs') as ReturnType<typeof supabase.from>)
        .update({
          fix_status: 'applied',
          fix_applied_at: new Date().toISOString(),
          rollback_data: rollbackData,
          fix_result: { success: true, newContent: newContent.substring(0, 1000) },
        } as Record<string, unknown>)
        .eq('id', diagnosticLogId)
    }

    return {
      success: true,
      message: `Successfully applied fix to ${fix.filePath}`,
      rollbackData,
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    // Log failure
    if (diagnosticLogId) {
      await (supabase.from('diagnostic_logs') as ReturnType<typeof supabase.from>)
        .update({
          fix_status: 'failed',
          fix_result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        } as Record<string, unknown>)
        .eq('id', diagnosticLogId)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply fix',
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Rollback a previously applied fix
 */
export async function rollbackFix(
  diagnosticLogId: string,
  userId: string
): Promise<FixResult> {
  const startTime = Date.now()
  const supabase = await createClient()

  // Get the rollback data
  const { data: log, error: fetchError } = await (supabase
    .from('diagnostic_logs') as ReturnType<typeof supabase.from>)
    .select('rollback_data, fix_status')
    .eq('id', diagnosticLogId)
    .eq('user_id', userId)
    .single()

  const logData = log as { rollback_data: RollbackData | null; fix_status: string } | null

  if (fetchError || !logData) {
    return {
      success: false,
      error: 'Diagnostic log not found',
      duration_ms: Date.now() - startTime,
    }
  }

  if (logData.fix_status !== 'applied') {
    return {
      success: false,
      error: `Cannot rollback: fix status is ${logData.fix_status}`,
      duration_ms: Date.now() - startTime,
    }
  }

  if (!logData.rollback_data) {
    return {
      success: false,
      error: 'No rollback data available',
      duration_ms: Date.now() - startTime,
    }
  }

  const rollbackData = logData.rollback_data
  const fullPath = join(getProjectRoot(), rollbackData.filePath)

  try {
    if (rollbackData.originalContent === null) {
      // Original file didn't exist - delete the created file
      const { unlink } = await import('fs/promises')
      await unlink(fullPath)
    } else {
      // Restore original content
      await writeFile(fullPath, rollbackData.originalContent, 'utf-8')
    }

    // Update log status
    await (supabase.from('diagnostic_logs') as ReturnType<typeof supabase.from>)
      .update({
        fix_status: 'rolled_back',
        fix_result: { rolledBackAt: new Date().toISOString() },
      } as Record<string, unknown>)
      .eq('id', diagnosticLogId)

    return {
      success: true,
      message: `Successfully rolled back changes to ${rollbackData.filePath}`,
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback',
      duration_ms: Date.now() - startTime,
    }
  }
}

/**
 * Batch apply multiple fixes
 */
export async function applyMultipleFixes(
  fixes: ProposedFix[],
  userId: string,
  diagnosticLogId?: string
): Promise<{
  success: boolean
  results: FixResult[]
  appliedCount: number
  failedCount: number
}> {
  const results: FixResult[] = []
  let appliedCount = 0
  let failedCount = 0

  for (const fix of fixes) {
    const result = await applyFix(fix, userId, diagnosticLogId)
    results.push(result)

    if (result.success) {
      appliedCount++
    } else {
      failedCount++
      // Stop on first failure to prevent partial changes
      break
    }
  }

  return {
    success: failedCount === 0,
    results,
    appliedCount,
    failedCount,
  }
}
