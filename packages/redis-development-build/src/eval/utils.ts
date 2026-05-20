import { access, readdir, readFile } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import { fileURLToPath } from 'url'

export const EVAL_UTILS_DIRNAME = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(EVAL_UTILS_DIRNAME, '../../../..')
export const SKILLS_DIR = join(REPO_ROOT, 'skills')
export const EVAL_WORKSPACES_DIR = join(REPO_ROOT, 'eval-workspaces')

export interface EvalSuitePathParts {
  skill: string
  suite: string
}

export async function discoverEvalSuiteDirs(): Promise<string[]> {
  const suiteDirs: string[] = []
  let skillEntries

  try {
    skillEntries = await readdir(SKILLS_DIR, { withFileTypes: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return []
    throw error
  }

  for (const skillEntry of skillEntries) {
    if (!skillEntry.isDirectory()) continue

    const evalsDir = join(SKILLS_DIR, skillEntry.name, 'evals')
    let suiteEntries
    try {
      suiteEntries = await readdir(evalsDir, { withFileTypes: true })
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') continue
      throw error
    }

    for (const suiteEntry of suiteEntries) {
      if (!suiteEntry.isDirectory()) continue
      const suiteDir = join(evalsDir, suiteEntry.name)
      if (await isEvalSuiteDir(suiteDir)) {
        suiteDirs.push(suiteDir)
      }
    }
  }

  return suiteDirs.sort((left, right) =>
    relative(REPO_ROOT, left).localeCompare(relative(REPO_ROOT, right))
  )
}

export async function isEvalSuiteDir(suiteDir: string): Promise<boolean> {
  try {
    await assertEvalSuiteDir(suiteDir)
    return true
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return false
    throw error
  }
}

export async function assertEvalSuiteDir(suiteDir: string): Promise<void> {
  await access(join(suiteDir, 'evals.json'))
  await access(join(suiteDir, 'model-matrix.json'))
}

export function evalSuitePathParts(suiteDir: string): EvalSuitePathParts {
  const parts = relative(SKILLS_DIR, suiteDir).split(/[\\/]/)
  return {
    skill: parts[0] ?? '',
    suite: parts[2] ?? '',
  }
}

export function resolveRepoPath(value: string): string {
  return isAbsolute(value) ? value : resolve(REPO_ROOT, value)
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return false
    throw error
  }
}

export function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function sumModelUsageCost(modelUsage: unknown): number {
  if (!modelUsage || typeof modelUsage !== 'object') return 0
  return Object.values(modelUsage).reduce((sum, usage) => {
    if (!usage || typeof usage !== 'object') return sum
    return sum + numberOrZero((usage as Record<string, unknown>).costUSD)
  }, 0)
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function signedPercent(value: number): string {
  const percentage = value * 100
  const roundedPercentage = Math.round(percentage)
  return `${roundedPercentage >= 0 ? '+' : ''}${roundedPercentage} points`
}

export function signedNumber(value: number, decimals: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}`
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`
}

export function signedUsd(value: number): string {
  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(4)}`
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
