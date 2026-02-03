/**
 * Tests for validator registry
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  getValidator,
  getValidatorNames,
  baseValidator,
  redisDevelopmentValidator,
  redisCloudApiValidator,
} from '../validators/index.js'

describe('validator registry', () => {
  describe('getValidator', () => {
    it('should return base validator when requested', () => {
      const validator = getValidator('base')

      assert.strictEqual(validator.name, 'base')
      assert.strictEqual(validator, baseValidator)
    })

    it('should return redis-development validator when requested', () => {
      const validator = getValidator('redis-development')

      assert.strictEqual(validator.name, 'redis-development')
      assert.strictEqual(validator, redisDevelopmentValidator)
    })

    it('should return redis-cloud-api validator when requested', () => {
      const validator = getValidator('redis-cloud-api')

      assert.strictEqual(validator.name, 'redis-cloud-api')
      assert.strictEqual(validator, redisCloudApiValidator)
    })

    it('should return base validator for unknown validator names', () => {
      const validator = getValidator('unknown-skill')

      assert.strictEqual(validator.name, 'base')
      assert.strictEqual(validator, baseValidator)
    })

    it('should return base validator for empty string', () => {
      const validator = getValidator('')

      assert.strictEqual(validator.name, 'base')
    })
  })

  describe('getValidatorNames', () => {
    it('should return array of validator names', () => {
      const names = getValidatorNames()

      assert.ok(Array.isArray(names))
      assert.ok(names.length >= 3)
    })

    it('should include base validator', () => {
      const names = getValidatorNames()

      assert.ok(names.includes('base'))
    })

    it('should include redis-development validator', () => {
      const names = getValidatorNames()

      assert.ok(names.includes('redis-development'))
    })

    it('should include redis-cloud-api validator', () => {
      const names = getValidatorNames()

      assert.ok(names.includes('redis-cloud-api'))
    })
  })

  describe('exported validators', () => {
    it('should export baseValidator', () => {
      assert.ok(baseValidator)
      assert.strictEqual(typeof baseValidator.validateRule, 'function')
    })

    it('should export redisDevelopmentValidator', () => {
      assert.ok(redisDevelopmentValidator)
      assert.strictEqual(typeof redisDevelopmentValidator.validateRule, 'function')
    })

    it('should export redisCloudApiValidator', () => {
      assert.ok(redisCloudApiValidator)
      assert.strictEqual(typeof redisCloudApiValidator.validateRule, 'function')
    })
  })

  describe('validator interface compliance', () => {
    it('all validators should have required properties', () => {
      const names = getValidatorNames()

      for (const name of names) {
        const validator = getValidator(name)

        assert.ok(validator.name, `Validator ${name} should have name`)
        assert.strictEqual(
          typeof validator.validateRule,
          'function',
          `Validator ${name} should have validateRule function`
        )
      }
    })

    it('validators can optionally have validateSkill method', () => {
      const names = getValidatorNames()

      for (const name of names) {
        const validator = getValidator(name)

        // validateSkill is optional, but if present must be a function
        if (validator.validateSkill !== undefined) {
          assert.strictEqual(
            typeof validator.validateSkill,
            'function',
            `Validator ${name} validateSkill should be a function if present`
          )
        }
      }
    })
  })
})
