/**
 * Tests for redis-development validator
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { redisDevelopmentValidator } from '../validators/redis-development.js'
import { Rule, CodeExample } from '../types.js'

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
    examples: [
      {
        label: 'Incorrect',
        code: '# bad code',
        language: 'python',
      },
      {
        label: 'Correct',
        code: '# good code',
        language: 'python',
      },
    ],
    ...overrides,
  }
}

describe('redisDevelopmentValidator', () => {
  describe('name', () => {
    it('should have name "redis-development"', () => {
      assert.strictEqual(redisDevelopmentValidator.name, 'redis-development')
    })
  })

  describe('validateRule', () => {
    it('should return no errors for a valid rule with bad and good examples', () => {
      const rule = createValidRule()
      const errors = redisDevelopmentValidator.validateRule(
        rule,
        'test.md',
        ''
      )

      assert.strictEqual(errors.length, 0)
    })

    describe('base validations', () => {
      it('should include base validation errors', () => {
        const rule = createValidRule({ title: '', explanation: '' })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.ok(errors.some((e) => e.message === 'Missing or empty title'))
        assert.ok(
          errors.some((e) => e.message === 'Missing or empty explanation')
        )
      })
    })

    describe('examples validation', () => {
      it('should return error when examples array is missing', () => {
        const rule = createValidRule({
          examples: undefined as unknown as CodeExample[],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.ok(
          errors.some((e) =>
            e.message.includes('Missing examples')
          )
        )
      })

      it('should return error when examples array is empty', () => {
        const rule = createValidRule({ examples: [] })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.ok(
          errors.some((e) =>
            e.message.includes('Missing examples')
          )
        )
      })

      it('should return error when examples have no code', () => {
        const rule = createValidRule({
          examples: [
            { label: 'Incorrect', code: '' },
            { label: 'Correct', code: '   ' },
          ],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.ok(errors.some((e) => e.message.includes('Missing code examples')))
      })
    })

    describe('bad example detection', () => {
      const badLabels = ['incorrect', 'Incorrect', 'INCORRECT', 'wrong', 'Wrong', 'bad', 'Bad', 'avoid', 'Avoid']

      for (const label of badLabels) {
        it(`should detect "${label}" as a bad example`, () => {
          const rule = createValidRule({
            examples: [
              { label, code: '# bad code' },
              { label: 'Correct', code: '# good code' },
            ],
          })
          const errors = redisDevelopmentValidator.validateRule(
            rule,
            'test.md',
            ''
          )

          assert.strictEqual(errors.length, 0, `Label "${label}" should be detected as bad`)
        })
      }

      it('should detect labels containing bad keywords', () => {
        const rule = createValidRule({
          examples: [
            { label: 'Incorrect (uses wrong pattern)', code: '# bad code' },
            { label: 'Correct', code: '# good code' },
          ],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.strictEqual(errors.length, 0)
      })
    })

    describe('good example detection', () => {
      const goodLabels = [
        'correct',
        'Correct',
        'CORRECT',
        'good',
        'Good',
        'usage',
        'Usage',
        'implementation',
        'Implementation',
        'example',
        'Example',
        'recommended',
        'Recommended',
      ]

      for (const label of goodLabels) {
        it(`should detect "${label}" as a good example`, () => {
          const rule = createValidRule({
            examples: [
              { label: 'Incorrect', code: '# bad code' },
              { label, code: '# good code' },
            ],
          })
          const errors = redisDevelopmentValidator.validateRule(
            rule,
            'test.md',
            ''
          )

          assert.strictEqual(errors.length, 0, `Label "${label}" should be detected as good`)
        })
      }

      it('should detect labels containing good keywords', () => {
        const rule = createValidRule({
          examples: [
            { label: 'Incorrect', code: '# bad code' },
            { label: 'Correct usage with async', code: '# good code' },
          ],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.strictEqual(errors.length, 0)
      })
    })

    describe('edge cases', () => {
      it('should accept rule with only good example', () => {
        const rule = createValidRule({
          examples: [{ label: 'Example', code: '# code' }],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        // Should pass - only one of good/bad is required
        assert.strictEqual(errors.length, 0)
      })

      it('should accept rule with only bad example', () => {
        const rule = createValidRule({
          examples: [{ label: 'Incorrect', code: '# code' }],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        // Should pass - only one of good/bad is required
        assert.strictEqual(errors.length, 0)
      })

      it('should fail when examples have unrecognized labels', () => {
        const rule = createValidRule({
          examples: [
            { label: 'Snippet', code: '# code' },
            { label: 'Code', code: '# more code' },
          ],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'test.md',
          ''
        )

        assert.ok(
          errors.some((e) =>
            e.message.includes('bad/incorrect or good/correct')
          )
        )
      })

      it('should include file and ruleId in errors', () => {
        const rule = createValidRule({
          id: '5.3',
          examples: [],
        })
        const errors = redisDevelopmentValidator.validateRule(
          rule,
          'my-rule.md',
          ''
        )

        assert.ok(errors.length > 0)
        assert.strictEqual(errors[0].file, 'my-rule.md')
        assert.strictEqual(errors[0].ruleId, '5.3')
      })
    })
  })
})
