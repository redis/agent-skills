/**
 * Validator for redis-cloud-api skill
 *
 * Rules in this skill should have:
 * - At least one endpoint documented
 * - curl example required
 * - Python example required
 * - TypeScript example required
 * - Common Errors table
 * - Reference link
 */

import { Rule, RuleValidator, ValidationError } from '../types.js'
import { runBaseValidations } from './base.js'

/**
 * Regex patterns for detecting endpoints
 * Matches patterns like:
 * - **Endpoint:** `GET /path`
 * - **Endpoint: `GET /path`**
 * - `GET /subscriptions/{subscriptionId}`
 * - https://api.redislabs.com/v1/subscriptions (in code examples)
 */
const ENDPOINT_PATTERNS = [
  /\*\*Endpoint:?\*?\*?\s*`?(GET|POST|PUT|DELETE|PATCH)\s+\/[^`\n]+`?/i,
  /`(GET|POST|PUT|DELETE|PATCH)\s+\/[^`]+`/i,
  /###\s+(GET|POST|PUT|DELETE|PATCH)\s+/i,
  /https:\/\/api\.redislabs\.com\/v1\/[a-zA-Z]/i, // API URL in examples
  /-X\s+(GET|POST|PUT|DELETE|PATCH)\s+"https:\/\/api\.redislabs\.com/i, // curl with method
]

/**
 * Check if content contains at least one endpoint or API URL reference
 */
function hasEndpoint(content: string): boolean {
  return ENDPOINT_PATTERNS.some((pattern) => pattern.test(content))
}

/**
 * Check if content contains a curl example
 */
function hasCurlExample(content: string): boolean {
  // Look for curl code block or ### curl section
  return (
    /```bash[\s\S]*?curl\s/i.test(content) ||
    /###\s*curl/i.test(content) ||
    /####\s*curl/i.test(content)
  )
}

/**
 * Check if content contains a Python example
 */
function hasPythonExample(content: string): boolean {
  return (
    /```python[\s\S]*?(import|requests|def\s)/i.test(content) ||
    /###\s*Python/i.test(content) ||
    /####\s*Python/i.test(content)
  )
}

/**
 * Check if content contains a TypeScript example
 */
function hasTypeScriptExample(content: string): boolean {
  return (
    /```typescript[\s\S]*?(const|let|var|async|await|fetch|interface)/i.test(
      content
    ) ||
    /###\s*TypeScript/i.test(content) ||
    /####\s*TypeScript/i.test(content)
  )
}

/**
 * Check if content contains a Common Errors table
 */
function hasCommonErrorsTable(content: string): boolean {
  // Look for a table with error codes or "Common Errors" heading
  return (
    /\*\*Common Errors:?\*\*/i.test(content) ||
    /###?\s*Common Errors/i.test(content) ||
    /\|\s*Code\s*\|\s*Meaning\s*\|/i.test(content) ||
    /\|\s*\d{3}\s*\|/i.test(content) // Table row with HTTP status code
  )
}

/**
 * Check if content contains a reference link
 */
function hasReferenceLink(content: string): boolean {
  return (
    /Reference:\s*\[.*?\]\(.*?\)/i.test(content) ||
    /References:\s*\[.*?\]\(.*?\)/i.test(content) ||
    /\[.*?\]\(https:\/\/redis\.io\/docs\/.*?\)/i.test(content)
  )
}

/**
 * Validator for redis-cloud-api skill
 */
export const redisCloudApiValidator: RuleValidator = {
  name: 'redis-cloud-api',

  validateRule(rule: Rule, file: string, content: string): ValidationError[] {
    // Run base validations first
    const errors = runBaseValidations(rule, file, content)

    // Check for at least one endpoint
    if (!hasEndpoint(content)) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Missing endpoint documentation. Rules should document at least one API endpoint (e.g., **Endpoint:** `GET /path`)',
      })
    }

    // Check for curl example
    if (!hasCurlExample(content)) {
      errors.push({
        file,
        ruleId: rule.id,
        message: 'Missing curl example. Each rule should include a curl example',
      })
    }

    // Check for Python example
    if (!hasPythonExample(content)) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Missing Python example. Each rule should include a Python example',
      })
    }

    // Check for TypeScript example
    if (!hasTypeScriptExample(content)) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Missing TypeScript example. Each rule should include a TypeScript example',
      })
    }

    // Check for Common Errors table
    if (!hasCommonErrorsTable(content)) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Missing Common Errors table. Each rule should include a table of common error codes',
      })
    }

    // Check for reference link
    if (!hasReferenceLink(content)) {
      errors.push({
        file,
        ruleId: rule.id,
        message:
          'Missing reference link. Each rule should include a reference link to Redis documentation',
      })
    }

    return errors
  },
}
