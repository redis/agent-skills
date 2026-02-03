#!/usr/bin/env node
/**
 * Validate rule files follow the correct structure
 *
 * Usage:
 *   npm run validate                    # Validate default skill
 *   npm run validate -- --all           # Validate all skills
 *   npm run validate -- --skill=name    # Validate specific skill
 */

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { ValidationError } from './types.js'
import { parseRuleFile } from './parser.js'
import { SKILLS, SkillConfig, DEFAULT_SKILL } from './config.js'
import { getValidator } from './validators/index.js'

// Parse command line arguments
const args = process.argv.slice(2)
const skillArg = args.find((arg) => arg.startsWith('--skill='))
const skillName = skillArg ? skillArg.split('=')[1] : null
const validateAll = args.includes('--all')

/**
 * Validate a single skill
 */
async function validateSkill(skillConfig: SkillConfig): Promise<ValidationError[]> {
  console.log(`\nValidating ${skillConfig.name}...`)
  console.log(`  Rules directory: ${skillConfig.rulesDir}`)

  // Get the validator for this skill
  const validatorName = skillConfig.validator || skillConfig.name
  const validator = getValidator(validatorName)
  console.log(`  Using validator: ${validator.name}`)

  let files: string[]
  try {
    files = await readdir(skillConfig.rulesDir)
  } catch {
    console.log('  No rules directory found. Nothing to validate.')
    return []
  }

  const ruleFiles = files.filter((f) => f.endsWith('.md') && !f.startsWith('_'))

  if (ruleFiles.length === 0) {
    console.log('  No rule files found. Nothing to validate.')
    return []
  }

  const allErrors: ValidationError[] = []

  for (const file of ruleFiles) {
    const filePath = join(skillConfig.rulesDir, file)
    try {
      // Read the raw content for validators that need it
      const content = await readFile(filePath, 'utf-8')
      
      // Parse the rule file
      const { rule } = await parseRuleFile(filePath, skillConfig.sectionMap)
      
      // Run the validator
      const errors = validator.validateRule(rule, file, content)
      allErrors.push(...errors)
    } catch (error) {
      allErrors.push({
        file,
        message: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  // Run skill-level validations if the validator supports it
  if (validator.validateSkill) {
    // We'd need to collect all rules first - for now, skip this
    // This can be added later if needed
  }

  if (allErrors.length === 0) {
    console.log(`  ✓ All ${ruleFiles.length} rule files are valid`)
  }

  return allErrors
}

/**
 * Main validation function
 */
async function validate() {
  try {
    console.log('Validating rule files...')

    const allErrors: ValidationError[] = []
    const skillsToValidate: SkillConfig[] = []

    if (validateAll) {
      // Validate all skills
      skillsToValidate.push(...Object.values(SKILLS))
    } else if (skillName) {
      // Validate specific skill
      const skill = SKILLS[skillName]
      if (!skill) {
        console.error(`Unknown skill: ${skillName}`)
        console.error(`Available skills: ${Object.keys(SKILLS).join(', ')}`)
        process.exit(1)
      }
      skillsToValidate.push(skill)
    } else {
      // Validate default skill (backwards compatibility)
      skillsToValidate.push(SKILLS[DEFAULT_SKILL])
    }

    // Validate each skill
    for (const skill of skillsToValidate) {
      const errors = await validateSkill(skill)
      allErrors.push(...errors)
    }

    // Report results
    if (allErrors.length > 0) {
      console.error('\n✗ Validation failed:\n')
      
      // Group errors by file
      const errorsByFile = new Map<string, ValidationError[]>()
      for (const error of allErrors) {
        const existing = errorsByFile.get(error.file) || []
        existing.push(error)
        errorsByFile.set(error.file, existing)
      }

      for (const [file, errors] of errorsByFile) {
        console.error(`  ${file}:`)
        for (const error of errors) {
          console.error(`    - ${error.message}`)
        }
      }

      console.error(`\n  Total: ${allErrors.length} error(s)`)
      process.exit(1)
    } else {
      console.log('\n✓ All validations passed')
    }
  } catch (error) {
    console.error('Validation failed:', error)
    process.exit(1)
  }
}

validate()
