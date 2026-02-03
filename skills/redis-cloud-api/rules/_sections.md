# Section Definitions

This file defines the rule categories for Redis Cloud API. Rules are automatically assigned to sections based on their filename prefix.

---

## 1. Authentication (auth)
**Impact:** HIGH
**Description:** API key configuration, authentication headers, and rate limit handling.

## 2. Async Operations (tasks)
**Impact:** HIGH
**Description:** Polling task status, listing tasks, understanding operation lifecycle, and handling async responses.

## 3. Pro Subscriptions (sub-pro)
**Impact:** HIGH
**Description:** Creating and managing Redis Cloud Pro subscriptions with flexible configuration. Includes Active-Active region management and maintenance windows.

## 4. Essentials Subscriptions (sub-ess)
**Impact:** MEDIUM
**Description:** Creating and managing Redis Cloud Essentials subscriptions for simpler deployments.

## 5. Pro Databases (db-pro)
**Impact:** HIGH
**Description:** Creating and managing databases within Pro subscriptions. Includes advanced features like Active-Active (CRDB) operations, backup, import, tags, and version upgrades.

## 6. Essentials Databases (db-ess)
**Impact:** MEDIUM
**Description:** Creating and managing databases within Essentials subscriptions. Includes operations like backup, import, tags, slow log, and version upgrades.

## 7. Connectivity (conn)
**Impact:** MEDIUM
**Description:** VPC peering, AWS Transit Gateway, AWS PrivateLink, and GCP Private Service Connect configuration. Includes Active-Active variants for multi-region deployments.

## 8. RBAC (rbac)
**Impact:** MEDIUM
**Description:** Role-based access control including ACL users, database access roles, and Redis ACL rules.

## 9. Cloud Accounts (cloud)
**Impact:** LOW
**Description:** Managing AWS cloud accounts for BYOA (Bring Your Own Account) deployments.

## 10. Account Management (account)
**Impact:** LOW
**Description:** Managing account users, reference data (regions, modules, versions), audit logs, session logs, and cost reports.

## 11. Error Handling (errors)
**Impact:** HIGH
**Description:** Understanding error codes, implementing retries, and handling common failure scenarios.
