/**
 * Base validator with common validations for all skills
 */

import { Rule, RuleValidator, ValidationError } from '../types.js'

/**
 * Valid impact levels
 */
const VALID_IMPACTS: Rule['impact'][] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM-HIGH',
  'MEDIUM',
  'LOW-MEDIUM',
  'LOW',
]

/**
 * Base validator that checks common requirements for all rules
 */
export const baseValidator: RuleValidator = {
  name: 'base',

  validateRule(rule: Rule, file: string, _content: string): ValidationError[] {
    const errors: ValidationError[] = []

    // Title is required
    if (!rule.title || rule.title.trim().length === 0) {
      errors.push({
        file,
        ruleId: rule.id,
        message: 'Missing or empty title',
      })
    }

    // Explanation is required
    if (!rule.explanation || rule.explanation.trim().length === 0) {
      errors.push({
        file,
        ruleId: rule.id,
        message: 'Missing or empty explanation',
      })
    }

    // Impact level must be valid
    if (!VALID_IMPACTS.includes(rule.impact)) {
      errors.push({
        file,
        ruleId: rule.id,
        message: `Invalid impact level: ${rule.impact}. Must be one of: ${VALID_IMPACTS.join(', ')}`,
      })
    }

    return errors
  },
}

/**
 * Helper function to run base validations
 * Can be used by skill-specific validators to include base checks
 */
export function runBaseValidations(
  rule: Rule,
  file: string,
  content: string
): ValidationError[] {
  return baseValidator.validateRule(rule, file, content)
}
