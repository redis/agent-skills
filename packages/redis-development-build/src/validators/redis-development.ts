/**
 * Validator for redis-development skill
 *
 * Rules in this skill should have:
 * - At least one "bad/incorrect" code example
 * - At least one "good/correct" code example
 */

import { Rule, RuleValidator, ValidationError } from '../types.js'
import { runBaseValidations } from './base.js'

/**
 * Labels that indicate a "bad" example
 */
const BAD_LABELS = ['incorrect', 'wrong', 'bad', 'avoid']

/**
 * Labels that indicate a "good" example
 */
const GOOD_LABELS = [
  'correct',
  'good',
  'usage',
  'implementation',
  'example',
  'recommended',
]

/**
 * Check if a label indicates a bad example
 */
function isBadExample(label: string): boolean {
  const lower = label.toLowerCase()
  return BAD_LABELS.some((bad) => lower.includes(bad))
}

/**
 * Check if a label indicates a good example
 */
function isGoodExample(label: string): boolean {
  const lower = label.toLowerCase()
  return GOOD_LABELS.some((good) => lower.includes(good))
}

/**
 * Validator for redis-development skill
 */
export const redisDevelopmentValidator: RuleValidator = {
  name: 'redis-development',

  validateRule(rule: Rule, file: string, content: string): ValidationError[] {
    // Run base validations first
    const errors = runBaseValidations(rule, file, content)

    // Check for examples
    if (!rule.examples || rule.examples.length === 0) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Missing examples (need at least one bad and one good example)',
      })
      return errors
    }

    // Filter to examples that have code
    const codeExamples = rule.examples.filter(
      (e) => e.code && e.code.trim().length > 0
    )

    if (codeExamples.length === 0) {
      errors.push({
        file,
        ruleId: rule.id,
        message: 'Missing code examples',
      })
      return errors
    }

    // Check for bad and good examples
    const hasBad = codeExamples.some((e) => isBadExample(e.label))
    const hasGood = codeExamples.some((e) => isGoodExample(e.label))

    if (!hasBad && !hasGood) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Examples must include at least one bad/incorrect or good/correct example',
      })
    }

    return errors
  },
}
