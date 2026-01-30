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
}

export const SKILLS: Record<string, SkillConfig> = {
  'redis-best-practices': {
    name: 'redis-best-practices',
    title: 'Redis Best Practices',
    description: 'Redis applications',
    skillDir: join(SKILLS_DIR, 'redis-best-practices'),
    rulesDir: join(SKILLS_DIR, 'redis-best-practices/rules'),
    metadataFile: join(SKILLS_DIR, 'redis-best-practices/metadata.json'),
    outputFile: join(SKILLS_DIR, 'redis-best-practices/AGENTS.md'),
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
  },
}

// Default skill
export const DEFAULT_SKILL = 'redis-best-practices'

// Legacy exports for backwards compatibility
export const SKILL_DIR = SKILLS[DEFAULT_SKILL].skillDir
export const RULES_DIR = SKILLS[DEFAULT_SKILL].rulesDir
export const METADATA_FILE = SKILLS[DEFAULT_SKILL].metadataFile
export const OUTPUT_FILE = SKILLS[DEFAULT_SKILL].outputFile
