# Redis Cloud API

A structured repository for creating and maintaining Redis Cloud API guidelines optimized for agents and LLMs.

## Structure

- `rules/` - Individual rule files (one per rule)
  - `_sections.md` - Section metadata (titles, impacts, descriptions)
  - `_template.md` - Template for creating new rules
  - `prefix-description.md` - Individual rule files
- `metadata.json` - Document metadata (version, organization, abstract)
- `AGENTS.md` - Compiled output (generated)
- `SKILL.md` - Skill definition and entry point
- `README.md` - This file

## Getting Started

1. Install dependencies from the repo root:
   ```bash
   npm install
   ```

2. Validate rule files:
   ```bash
   npm run validate
   ```

3. Build AGENTS.md from rules:
   ```bash
   npm run build
   ```

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/prefix-description.md`
2. Choose the appropriate area prefix:
   - `auth-` for Authentication
   - `tasks-` for Async Operations
   - `sub-pro-` for Pro Subscriptions (including Active-Active regions, maintenance)
   - `sub-ess-` for Essentials Subscriptions
   - `db-pro-` for Pro Databases (including Active-Active/CRDB, operations)
   - `db-ess-` for Essentials Databases (including operations)
   - `conn-` for Connectivity (VPC peering, Transit Gateway, PrivateLink, PSC)
   - `rbac-` for Role-based Access Control
   - `cloud-` for Cloud Accounts (BYOA)
   - `account-` for Account Management (users, reference data, logs, cost reports)
   - `errors-` for Error Handling
3. Fill in the frontmatter and content
4. Include examples in curl, Python, and TypeScript
5. Run `npm run build` to regenerate AGENTS.md

## Rule File Structure

Each rule file should follow this structure:

```markdown
---
title: Rule Title Here
impact: HIGH
impactDescription: Brief description of impact
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the operation and when to use it.

**Endpoint:** `METHOD /path`

### curl

```bash
curl -X METHOD "https://api.redislabs.com/v1/path" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Python

```python
import requests
# Example code
```

### TypeScript

```typescript
// Example code
```

**Best Practices:**
- Tip 1
- Tip 2

Reference: [Link](https://redis.io/docs/)
```

## Current Rules (29 total)

### Authentication (2 rules)
- `auth-api-keys` - API key configuration
- `auth-rate-limits` - Rate limit handling

### Async Operations (1 rule)
- `tasks-async-operations` - Task polling and lifecycle

### Pro Subscriptions (4 rules)
- `sub-pro-create` - Create subscriptions
- `sub-pro-manage` - Manage subscriptions (CIDR, pricing)
- `sub-pro-maintenance` - Maintenance windows
- `sub-pro-active-active-regions` - Active-Active region management

### Essentials Subscriptions (2 rules)
- `sub-ess-create` - Create subscriptions
- `sub-ess-manage` - Manage subscriptions

### Pro Databases (4 rules)
- `db-pro-create` - Create databases
- `db-pro-manage` - Manage databases
- `db-pro-operations` - Backup, import, tags, upgrade
- `db-pro-active-active` - CRDB operations

### Essentials Databases (3 rules)
- `db-ess-create` - Create databases
- `db-ess-manage` - Manage databases
- `db-ess-operations` - Backup, import, tags, upgrade

### Connectivity (4 rules)
- `conn-vpc-peering` - VPC peering (standard + Active-Active)
- `conn-transit-gateway` - AWS Transit Gateway (standard + Active-Active)
- `conn-private-link` - AWS PrivateLink (standard + Active-Active)
- `conn-private-connect` - GCP PSC (standard + Active-Active)

### RBAC (3 rules)
- `rbac-users` - ACL users
- `rbac-roles` - Database access roles
- `rbac-rules` - Redis ACL rules

### Cloud Accounts (1 rule)
- `cloud-accounts` - AWS BYOA accounts

### Account Management (4 rules)
- `account-users` - Account users
- `account-reference-data` - Regions, modules, versions, payment methods
- `account-logs` - Audit and session logs
- `account-cost-reports` - Cost reports

### Error Handling (1 rule)
- `errors-handling` - Error codes and retries

## File Naming Convention

- Files starting with `_` are special (excluded from build)
- Rule files: `prefix-description.md` (e.g., `auth-api-keys.md`)
- Section is automatically inferred from filename prefix
- Rules are sorted alphabetically by title within each section

## Impact Levels

- `HIGH` - Critical operations or common pitfalls
- `MEDIUM` - Important but less frequently used operations
- `LOW` - Supplementary operations

## API Reference

The full OpenAPI specification is available in `openapi.json` at the repository root. This skill provides guidance on how to use the API effectively, while the OpenAPI spec contains complete schema details.

- [Redis Cloud API Documentation](https://redis.io/docs/latest/operate/rc/api/)
- [API Reference](https://redis.io/docs/latest/operate/rc/api/api-reference/)

## Scripts

(Run these from the repo root)

- `npm run build` - Compile rules into AGENTS.md
- `npm run validate` - Validate all rule files

## Contributing

When adding or modifying rules:

1. Use the correct filename prefix for your section
2. Follow the `_template.md` structure
3. Include examples in all three languages (curl, Python, TypeScript)
4. Add appropriate tags
5. Run `npm run build` to regenerate AGENTS.md

## Coverage

This skill covers all 88 endpoints in the Redis Cloud API v1, including:
- Standard subscription and database operations
- Active-Active (geo-replicated) deployments
- All connectivity options (VPC peering, Transit Gateway, PrivateLink, PSC)
- Active-Active connectivity variants for all providers
- Reference data and account management
- Cost reports and audit logs
