/**
 * Configuration for the build tooling
 */

import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Base paths
export const SKILLS_DIR = join(__dirname, '../../..', 'skills')
export const BUILD_DIR = join(__dirname, '..')

// Skill configurations
export interface SkillConfig {
  name: string
  title: string
  description: string
  skillDir: string
  rulesDir: string
  metadataFile: string
  outputFile: string
  sectionMap: Record<string, number>
  /** Name of the validator to use (defaults to skill name, falls back to 'base') */
  validator?: string
}

export const SKILLS: Record<string, SkillConfig> = {
  'redis-development': {
    name: 'redis-development',
    title: 'Redis Development',
    description: `This document is mainly for agents and LLMs to follow when maintaining,  
generating, or refactoring Redis applications. Humans  
may also find it useful, but guidance here is optimized for automation  
and consistency by AI-assisted workflows.`,
    skillDir: join(SKILLS_DIR, 'redis-development'),
    rulesDir: join(SKILLS_DIR, 'redis-development/rules'),
    metadataFile: join(SKILLS_DIR, 'redis-development/metadata.json'),
    outputFile: join(SKILLS_DIR, 'redis-development/AGENTS.md'),
    sectionMap: {
      data: 1,
      ram: 2,
      conn: 3,
      json: 4,
      rqe: 5,
      vector: 6,
      'semantic-cache': 7,
      stream: 8,
      cluster: 9,
      security: 10,
      observe: 11,
    },
    validator: 'redis-development',
  },
  'redis-cloud-api': {
    name: 'redis-cloud-api',
    title: 'Redis Cloud API',
    description: `This document is mainly for agents and LLMs to follow when working  
with the Redis Cloud API. Humans may also find it useful, but guidance here is 
optimized for automation and consistency by AI-assisted workflows.`,
    skillDir: join(SKILLS_DIR, 'redis-cloud-api'),
    rulesDir: join(SKILLS_DIR, 'redis-cloud-api/rules'),
    metadataFile: join(SKILLS_DIR, 'redis-cloud-api/metadata.json'),
    outputFile: join(SKILLS_DIR, 'redis-cloud-api/AGENTS.md'),
    sectionMap: {
      auth: 1,
      tasks: 2,
      'sub-pro': 3,
      'sub-ess': 4,
      'db-pro': 5,
      'db-ess': 6,
      conn: 7,
      rbac: 8,
      cloud: 9,
      account: 10,
      errors: 11,
    },
    validator: 'redis-cloud-api',
  },
}

// Default skill
export const DEFAULT_SKILL = 'redis-development'

// Legacy exports for backwards compatibility
export const SKILL_DIR = SKILLS[DEFAULT_SKILL].skillDir
export const RULES_DIR = SKILLS[DEFAULT_SKILL].rulesDir
export const METADATA_FILE = SKILLS[DEFAULT_SKILL].metadataFile
export const OUTPUT_FILE = SKILLS[DEFAULT_SKILL].outputFile
