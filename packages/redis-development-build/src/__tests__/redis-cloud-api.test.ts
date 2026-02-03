/**
 * Tests for redis-cloud-api validator
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { redisCloudApiValidator } from '../validators/redis-cloud-api.js'
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

/**
 * Creates content that passes all redis-cloud-api validations
 */
function createValidContent(): string {
  return `
## Create Subscription

This endpoint creates a new subscription.

**Endpoint:** \`POST /subscriptions\`

### curl

\`\`\`bash
curl -X POST "https://api.redislabs.com/v1/subscriptions" \\
  -H "x-api-key: $API_KEY" \\
  -H "x-api-secret-key: $API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-subscription"}'
\`\`\`

### Python

\`\`\`python
import requests

response = requests.post(
    "https://api.redislabs.com/v1/subscriptions",
    headers={"x-api-key": API_KEY, "x-api-secret-key": API_SECRET},
    json={"name": "my-subscription"}
)
\`\`\`

### TypeScript

\`\`\`typescript
const response = await fetch("https://api.redislabs.com/v1/subscriptions", {
  method: "POST",
  headers: {
    "x-api-key": API_KEY,
    "x-api-secret-key": API_SECRET,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ name: "my-subscription" })
});
\`\`\`

**Common Errors:**

| Code | Meaning |
|------|---------|
| 400  | Invalid request body |
| 401  | Authentication failed |
| 403  | Insufficient permissions |

Reference: [Redis Cloud API](https://redis.io/docs/latest/operate/rc/api/)
`
}

describe('redisCloudApiValidator', () => {
  describe('name', () => {
    it('should have name "redis-cloud-api"', () => {
      assert.strictEqual(redisCloudApiValidator.name, 'redis-cloud-api')
    })
  })

  describe('validateRule', () => {
    it('should return no errors for valid content', () => {
      const rule = createValidRule()
      const content = createValidContent()
      const errors = redisCloudApiValidator.validateRule(
        rule,
        'test.md',
        content
      )

      assert.strictEqual(errors.length, 0)
    })

    describe('base validations', () => {
      it('should include base validation errors', () => {
        const rule = createValidRule({ title: '', explanation: '' })
        const content = createValidContent()
        const errors = redisCloudApiValidator.validateRule(
          rule,
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message === 'Missing or empty title'))
        assert.ok(
          errors.some((e) => e.message === 'Missing or empty explanation')
        )
      })
    })

    describe('endpoint validation', () => {
      it('should detect **Endpoint:** `GET /path` format', () => {
        const content = `
**Endpoint:** \`GET /subscriptions/{subscriptionId}\`

\`\`\`bash
curl https://api.redislabs.com/v1/subscriptions
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| Code | Meaning |
|------|---------|
| 404  | Not found |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing endpoint')))
      })

      it('should detect inline endpoint format `POST /path`', () => {
        const content = `
Use \`POST /subscriptions\` to create.

\`\`\`bash
curl https://api.redislabs.com/v1/subscriptions
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| Code | Meaning |
|------|---------|
| 400  | Bad request |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing endpoint')))
      })

      it('should detect ### GET section header format', () => {
        const content = `
### GET /subscriptions

\`\`\`bash
curl https://api.redislabs.com/v1/subscriptions
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| Code | Meaning |
|------|---------|
| 404  | Not found |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing endpoint')))
      })

      it('should detect API URL in examples', () => {
        const content = `
Some text without explicit endpoint.

\`\`\`bash
curl -X POST "https://api.redislabs.com/v1/subscriptions"
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| Code | Meaning |
|------|---------|
| 500  | Server error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing endpoint')))
      })

      it('should return error when no endpoint is documented', () => {
        const content = `
Just some text without any endpoint.

\`\`\`bash
curl https://example.com
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| Code | Meaning |
|------|---------|
| 500  | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message.includes('Missing endpoint')))
      })
    })

    describe('curl example validation', () => {
      it('should detect curl in bash code block', () => {
        const content = createValidContent()
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing curl')))
      })

      it('should detect ### curl section header', () => {
        const content = `
**Endpoint:** \`GET /test\`

### curl

Some curl instructions.

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing curl')))
      })

      it('should return error when curl example is missing', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message.includes('Missing curl')))
      })
    })

    describe('Python example validation', () => {
      it('should detect Python code block with import', () => {
        const content = createValidContent()
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing Python')))
      })

      it('should detect ### Python section header', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

### Python

Some Python instructions.

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing Python')))
      })

      it('should return error when Python example is missing', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message.includes('Missing Python')))
      })
    })

    describe('TypeScript example validation', () => {
      it('should detect TypeScript code block with keywords', () => {
        const content = createValidContent()
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing TypeScript')))
      })

      it('should detect ### TypeScript section header', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

### TypeScript

Some TS instructions.

| 400 | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing TypeScript')))
      })

      it('should return error when TypeScript example is missing', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

| 400 | Error |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message.includes('Missing TypeScript')))
      })
    })

    describe('Common Errors table validation', () => {
      it('should detect **Common Errors:** section', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

**Common Errors:**

| Code | Meaning |
|------|---------|
| 400  | Bad request |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing Common Errors')))
      })

      it('should detect table with HTTP status codes', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Bad request |
| 401 | Unauthorized |

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing Common Errors')))
      })

      it('should return error when Common Errors table is missing', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

Reference: [Link](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message.includes('Missing Common Errors')))
      })
    })

    describe('Reference link validation', () => {
      it('should detect Reference: [text](url) format', () => {
        const content = createValidContent()
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing reference')))
      })

      it('should detect redis.io docs link', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Error |

See [API documentation](https://redis.io/docs/latest/operate/rc/api/)
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(!errors.some((e) => e.message.includes('Missing reference')))
      })

      it('should return error when reference link is missing', () => {
        const content = `
**Endpoint:** \`GET /test\`

\`\`\`bash
curl https://api.redislabs.com/v1/test
\`\`\`

\`\`\`python
import requests
\`\`\`

\`\`\`typescript
const x = await fetch()
\`\`\`

| 400 | Error |

Some text without a reference link.
`
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        assert.ok(errors.some((e) => e.message.includes('Missing reference')))
      })
    })

    describe('multiple errors', () => {
      it('should return all errors when content is completely invalid', () => {
        const content = 'Just some plain text with nothing.'
        const errors = redisCloudApiValidator.validateRule(
          createValidRule(),
          'test.md',
          content
        )

        // Should have errors for: endpoint, curl, Python, TypeScript, errors table, reference
        assert.ok(errors.length >= 6)
      })
    })
  })
})
