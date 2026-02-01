#!/usr/bin/env node
/**
 * Validate rule files follow the correct structure
 */

import { readdir } from 'fs/promises'
import { join } from 'path'
import { Rule } from './types.js'
import { parseRuleFile } from './parser.js'
import { RULES_DIR } from './config.js'

interface ValidationError {
  file: string
  ruleId?: string
  message: string
}

/**
 * Validate a rule
 */
function validateRule(rule: Rule, file: string): ValidationError[] {
  const errors: ValidationError[] = []

  // Note: rule.id is auto-generated during build, not required in source files

  if (!rule.title || rule.title.trim().length === 0) {
    errors.push({ file, ruleId: rule.id, message: 'Missing or empty title' })
  }

  if (!rule.explanation || rule.explanation.trim().length === 0) {
    errors.push({ file, ruleId: rule.id, message: 'Missing or empty explanation' })
  }

  if (!rule.examples || rule.examples.length === 0) {
    errors.push({ file, ruleId: rule.id, message: 'Missing examples (need at least one code example)' })
  } else {
    // Filter out informational examples (notes, trade-offs, etc.) that don't have code
    const codeExamples = rule.examples.filter(e => e.code && e.code.trim().length > 0)

    // Check for "bad" pattern examples (anti-patterns that cause real harm)
    const hasBad = codeExamples.some(e =>
      e.label.toLowerCase().includes('incorrect') ||
      e.label.toLowerCase().includes('wrong') ||
      e.label.toLowerCase().includes('bad') ||
      e.label.toLowerCase().includes('avoid')
    )

    // Check for "good" pattern examples
    // Note: Language labels like "Python" and "Java" are valid as they contain code examples
    const hasGood = codeExamples.some(e =>
      e.label.toLowerCase().includes('correct') ||
      e.label.toLowerCase().includes('good') ||
      e.label.toLowerCase().includes('usage') ||
      e.label.toLowerCase().includes('implementation') ||
      e.label.toLowerCase().includes('example') ||
      e.label.toLowerCase().includes('recommended') ||
      e.label.toLowerCase().includes('python') ||
      e.label.toLowerCase().includes('java') ||
      e.label.toLowerCase().includes('javascript') ||
      e.label.toLowerCase().includes('typescript') ||
      e.label.toLowerCase().includes('go') ||
      e.label.toLowerCase().includes('ruby') ||
      e.label.toLowerCase().includes('c#') ||
      e.label.toLowerCase().includes('rust')
    )

    // Check for "when to use" guidance (alternative to "incorrect" for feature-introduction rules)
    const hasWhenToUse = rule.examples.some(e =>
      e.label.toLowerCase().includes('when to use') ||
      e.label.toLowerCase().includes('when not')
    )

    if (codeExamples.length === 0) {
      errors.push({ file, ruleId: rule.id, message: 'Missing code examples' })
    } else if (!hasGood) {
      // Must have at least one good/correct example or language-labeled code block
      errors.push({ file, ruleId: rule.id, message: 'Missing good/correct examples' })
    }
    // Note: "Incorrect" examples are optional - rules can use "When to use" guidance instead
  }

  const validImpacts: Rule['impact'][] = ['CRITICAL', 'HIGH', 'MEDIUM-HIGH', 'MEDIUM', 'LOW-MEDIUM', 'LOW']
  if (!validImpacts.includes(rule.impact)) {
    errors.push({ file, ruleId: rule.id, message: `Invalid impact level: ${rule.impact}. Must be one of: ${validImpacts.join(', ')}` })
  }

  return errors
}

/**
 * Main validation function
 */
async function validate() {
  try {
    console.log('Validating rule files...')
    console.log(`Rules directory: ${RULES_DIR}`)

    let files: string[]
    try {
      files = await readdir(RULES_DIR)
    } catch {
      console.log('No rules directory found. Nothing to validate.')
      return
    }

    const ruleFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'))

    if (ruleFiles.length === 0) {
      console.log('No rule files found. Nothing to validate.')
      return
    }

    const allErrors: ValidationError[] = []

    for (const file of ruleFiles) {
      const filePath = join(RULES_DIR, file)
      try {
        const { rule } = await parseRuleFile(filePath)
        const errors = validateRule(rule, file)
        allErrors.push(...errors)
      } catch (error) {
        allErrors.push({
          file,
          message: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    }

    if (allErrors.length > 0) {
      console.error('\n✗ Validation failed:\n')
      allErrors.forEach(error => {
        console.error(`  ${error.file}${error.ruleId ? ` (${error.ruleId})` : ''}: ${error.message}`)
      })
      process.exit(1)
    } else {
      console.log(`✓ All ${ruleFiles.length} rule files are valid`)
    }
  } catch (error) {
    console.error('Validation failed:', error)
    process.exit(1)
  }
}

validate()
