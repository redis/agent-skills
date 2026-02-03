/**
 * Validator registry - loads and provides validators for each skill
 */

import { RuleValidator } from '../types.js'
import { baseValidator } from './base.js'
import { redisDevelopmentValidator } from './redis-development.js'
import { redisCloudApiValidator } from './redis-cloud-api.js'

/**
 * Registry of all available validators
 */
const validators: Record<string, RuleValidator> = {
  base: baseValidator,
  'redis-development': redisDevelopmentValidator,
  'redis-cloud-api': redisCloudApiValidator,
}

/**
 * Get a validator by name
 * @param name The validator name (matches skill name or 'base')
 * @returns The validator, or base validator if not found
 */
export function getValidator(name: string): RuleValidator {
  return validators[name] || validators.base
}

/**
 * Get all registered validator names
 */
export function getValidatorNames(): string[] {
  return Object.keys(validators)
}

export { baseValidator, redisDevelopmentValidator, redisCloudApiValidator }
