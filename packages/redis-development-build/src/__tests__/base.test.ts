/**
 * Tests for base validator
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { baseValidator, runBaseValidations } from '../validators/base.js'
import { Rule } from '../types.js'

/**
 * Helper to create a valid rule for testing
 */
function createValidRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '1.1',
    title: 'Test Rule',
    section: 1,
    impact: 'HIGH',
    explanation: 'This is a test explanation.',
    examples: [],
    ...overrides,
  }
}

describe('baseValidator', () => {
  describe('name', () => {
    it('should have name "base"', () => {
      assert.strictEqual(baseValidator.name, 'base')
    })
  })

  describe('validateRule', () => {
    it('should return no errors for a valid rule', () => {
      const rule = createValidRule()
      const errors = baseValidator.validateRule(rule, 'test.md', '')

      assert.strictEqual(errors.length, 0)
    })

    describe('title validation', () => {
      it('should return error for missing title', () => {
        const rule = createValidRule({ title: '' })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 1)
        assert.strictEqual(errors[0].message, 'Missing or empty title')
        assert.strictEqual(errors[0].file, 'test.md')
        assert.strictEqual(errors[0].ruleId, '1.1')
      })

      it('should return error for whitespace-only title', () => {
        const rule = createValidRule({ title: '   ' })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 1)
        assert.strictEqual(errors[0].message, 'Missing or empty title')
      })

      it('should return error for undefined title', () => {
        const rule = createValidRule({ title: undefined as unknown as string })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.ok(errors.some((e) => e.message === 'Missing or empty title'))
      })
    })

    describe('explanation validation', () => {
      it('should return error for missing explanation', () => {
        const rule = createValidRule({ explanation: '' })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 1)
        assert.strictEqual(errors[0].message, 'Missing or empty explanation')
      })

      it('should return error for whitespace-only explanation', () => {
        const rule = createValidRule({ explanation: '\n\t  ' })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 1)
        assert.strictEqual(errors[0].message, 'Missing or empty explanation')
      })
    })

    describe('impact validation', () => {
      it('should accept all valid impact levels', () => {
        const validImpacts = [
          'CRITICAL',
          'HIGH',
          'MEDIUM-HIGH',
          'MEDIUM',
          'LOW-MEDIUM',
          'LOW',
        ] as const

        for (const impact of validImpacts) {
          const rule = createValidRule({ impact })
          const errors = baseValidator.validateRule(rule, 'test.md', '')

          assert.strictEqual(
            errors.length,
            0,
            `Impact "${impact}" should be valid`
          )
        }
      })

      it('should return error for invalid impact level', () => {
        const rule = createValidRule({
          impact: 'INVALID' as Rule['impact'],
        })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 1)
        assert.ok(errors[0].message.includes('Invalid impact level'))
        assert.ok(errors[0].message.includes('INVALID'))
      })

      it('should return error for lowercase impact level', () => {
        const rule = createValidRule({
          impact: 'high' as Rule['impact'],
        })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 1)
        assert.ok(errors[0].message.includes('Invalid impact level'))
      })
    })

    describe('multiple errors', () => {
      it('should return multiple errors when multiple fields are invalid', () => {
        const rule = createValidRule({
          title: '',
          explanation: '',
          impact: 'INVALID' as Rule['impact'],
        })
        const errors = baseValidator.validateRule(rule, 'test.md', '')

        assert.strictEqual(errors.length, 3)
      })
    })
  })
})

describe('runBaseValidations', () => {
  it('should be a passthrough to baseValidator.validateRule', () => {
    const rule = createValidRule()
    const errors1 = baseValidator.validateRule(rule, 'test.md', 'content')
    const errors2 = runBaseValidations(rule, 'test.md', 'content')

    assert.deepStrictEqual(errors1, errors2)
  })

  it('should work with invalid rules', () => {
    const rule = createValidRule({ title: '' })
    const errors = runBaseValidations(rule, 'test.md', '')

    assert.strictEqual(errors.length, 1)
    assert.strictEqual(errors[0].message, 'Missing or empty title')
  })
})
