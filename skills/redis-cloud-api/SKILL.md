---
name: redis-cloud-api
description: Redis Cloud API operations and best practices. Use this skill when making API calls to manage Redis Cloud resources including subscriptions, databases, VPC peering, RBAC, and cloud accounts.
license: MIT
metadata:
  author: redis
  version: "1.0.0"
---

# Redis Cloud API

Comprehensive guide for using the Redis Cloud REST API to programmatically manage Redis Cloud resources. Contains rules for authentication, async operations, subscriptions, databases, connectivity, RBAC, and error handling.

## When to Apply

Reference these guidelines when:
- Authenticating with the Redis Cloud API
- Creating or managing Pro or Essentials subscriptions
- Creating or managing databases (standard or Active-Active)
- Configuring Active-Active (geo-replicated) deployments
- Setting up VPC peering, Transit Gateway, PrivateLink, or Private Service Connect
- Managing RBAC users, roles, and Redis ACL rules
- Handling async operations and polling task status
- Dealing with API errors and rate limits
- Configuring maintenance windows
- Performing database operations (backup, import, flush, tags, upgrades)
- Accessing reference data (regions, modules, versions, payment methods)
- Reviewing audit logs, session logs, or cost reports

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Authentication | HIGH | `auth-` |
| 2 | Async Operations | HIGH | `tasks-` |
| 3 | Pro Subscriptions | HIGH | `sub-pro-` |
| 4 | Essentials Subscriptions | MEDIUM | `sub-ess-` |
| 5 | Pro Databases | HIGH | `db-pro-` |
| 6 | Essentials Databases | MEDIUM | `db-ess-` |
| 7 | Connectivity | MEDIUM | `conn-` |
| 8 | RBAC | MEDIUM | `rbac-` |
| 9 | Cloud Accounts | LOW | `cloud-` |
| 10 | Account Management | LOW | `account-` |
| 11 | Error Handling | HIGH | `errors-` |

## Quick Reference

### 1. Authentication (HIGH)

- `auth-api-keys` - Configure API Key Authentication
- `auth-rate-limits` - Handle Rate Limits and Throttling

### 2. Async Operations (HIGH)

- `tasks-async-operations` - Poll Task Status for Async Operations

### 3. Pro Subscriptions (HIGH)

- `sub-pro-create` - Create Pro Subscriptions
- `sub-pro-manage` - Manage Pro Subscriptions (includes CIDR and pricing)
- `sub-pro-maintenance` - Configure Maintenance Windows
- `sub-pro-active-active-regions` - Manage Active-Active Subscription Regions

### 4. Essentials Subscriptions (MEDIUM)

- `sub-ess-create` - Create Essentials Subscriptions
- `sub-ess-manage` - Manage Essentials Subscriptions

### 5. Pro Databases (HIGH)

- `db-pro-create` - Create Pro Databases
- `db-pro-manage` - Manage Pro Databases
- `db-pro-operations` - Database Operations (Backup, Import, Tags, Upgrade)
- `db-pro-active-active` - Manage Active-Active Databases (CRDB)

### 6. Essentials Databases (MEDIUM)

- `db-ess-create` - Create Essentials Databases
- `db-ess-manage` - Manage Essentials Databases
- `db-ess-operations` - Essentials Database Operations (Backup, Import, Tags, Upgrade)

### 7. Connectivity (MEDIUM)

- `conn-vpc-peering` - Configure VPC Peering (Standard and Active-Active)
- `conn-transit-gateway` - Configure AWS Transit Gateway (Standard and Active-Active)
- `conn-private-link` - Configure AWS PrivateLink (Standard and Active-Active)
- `conn-private-connect` - Configure GCP Private Service Connect (Standard and Active-Active)

### 8. RBAC (MEDIUM)

- `rbac-users` - Manage ACL Users
- `rbac-roles` - Manage Database Access Roles
- `rbac-rules` - Manage Redis ACL Rules

### 9. Cloud Accounts (LOW)

- `cloud-accounts` - Manage AWS Cloud Accounts (BYOA)

### 10. Account Management (LOW)

- `account-users` - Manage Account Users
- `account-reference-data` - Reference Data and Account Information
- `account-logs` - Audit and Session Logs
- `account-cost-reports` - Cost Reports

### 11. Error Handling (HIGH)

- `errors-handling` - Handle API Errors and Retries

## API Base URL

```
https://api.redislabs.com/v1
```

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/auth-api-keys.md
rules/tasks-async-operations.md
rules/sub-pro-create.md
rules/conn-private-link.md
rules/db-pro-active-active.md
```

Each rule file contains:
- Brief explanation of the operation
- curl, Python, and TypeScript examples
- Best practices and common pitfalls
- Error handling guidance

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
