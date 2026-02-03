# Redis Cloud API

**Version 1.0.0**  
Redis, Inc.  
February 2026

> **Note:**  
> This document is mainly for agents and LLMs to follow when maintaining,  
> generating, or refactoring Redis Cloud API operations. Humans  
> may also find it useful, but guidance here is optimized for automation  
> and consistency by AI-assisted workflows.

---

## Abstract

Guidelines for using the Redis Cloud REST API to manage subscriptions, databases, connectivity, RBAC, and cloud accounts. Includes authentication, async operation handling, and error management. Optimized for AI agents and LLMs.

---

## Table of Contents

1. [Authentication](#1-authentication) — **HIGH**
   - 1.1 [Configure API Key Authentication](#11-configure-api-key-authentication)
   - 1.2 [Handle Rate Limits and Throttling](#12-handle-rate-limits-and-throttling)
2. [Async Operations](#2-async-operations) — **HIGH**
   - 2.1 [Poll Task Status for Async Operations](#21-poll-task-status-for-async-operations)
3. [Pro Subscriptions](#3-pro-subscriptions) — **HIGH**
   - 3.1 [Configure Maintenance Windows](#31-configure-maintenance-windows)
   - 3.2 [Create Pro Subscriptions](#32-create-pro-subscriptions)
   - 3.3 [Manage Active-Active Subscription Regions](#33-manage-active-active-subscription-regions)
   - 3.4 [Manage Pro Subscriptions](#34-manage-pro-subscriptions)
4. [Essentials Subscriptions](#4-essentials-subscriptions) — **MEDIUM**
   - 4.1 [Create Essentials Subscriptions](#41-create-essentials-subscriptions)
   - 4.2 [Manage Essentials Subscriptions](#42-manage-essentials-subscriptions)
5. [Pro Databases](#5-pro-databases) — **HIGH**
   - 5.1 [Create Pro Databases](#51-create-pro-databases)
   - 5.2 [Database Operations (Backup, Import, Tags)](#52-database-operations-backup-import-tags)
   - 5.3 [Manage Active-Active Databases (CRDB)](#53-manage-active-active-databases-crdb)
   - 5.4 [Manage Pro Databases](#54-manage-pro-databases)
6. [Essentials Databases](#6-essentials-databases) — **MEDIUM**
   - 6.1 [Create Essentials Databases](#61-create-essentials-databases)
   - 6.2 [Essentials Database Operations (Backup, Import, Tags)](#62-essentials-database-operations-backup-import-tags)
   - 6.3 [Manage Essentials Databases](#63-manage-essentials-databases)
7. [Connectivity](#7-connectivity) — **MEDIUM**
   - 7.1 [Configure AWS PrivateLink](#71-configure-aws-privatelink)
   - 7.2 [Configure AWS Transit Gateway](#72-configure-aws-transit-gateway)
   - 7.3 [Configure GCP Private Service Connect](#73-configure-gcp-private-service-connect)
   - 7.4 [Configure VPC Peering](#74-configure-vpc-peering)
8. [RBAC](#8-rbac) — **MEDIUM**
   - 8.1 [Manage ACL Users](#81-manage-acl-users)
   - 8.2 [Manage Database Access Roles](#82-manage-database-access-roles)
   - 8.3 [Manage Redis ACL Rules](#83-manage-redis-acl-rules)
9. [Cloud Accounts](#9-cloud-accounts) — **LOW**
   - 9.1 [Manage AWS Cloud Accounts](#91-manage-aws-cloud-accounts)
10. [Account Management](#10-account-management) — **LOW**
   - 10.1 [Audit and Session Logs](#101-audit-and-session-logs)
   - 10.2 [Cost Reports](#102-cost-reports)
   - 10.3 [Manage Account Users](#103-manage-account-users)
   - 10.4 [Reference Data and Account Information](#104-reference-data-and-account-information)
11. [Error Handling](#11-error-handling) — **HIGH**
   - 11.1 [Handle API Errors and Retries](#111-handle-api-errors-and-retries)

---

## 1. Authentication

**Impact: HIGH**

API key configuration, authentication headers, and rate limit handling.

### 1.1 Configure API Key Authentication

**Impact: HIGH (Required for all API operations)**

All Redis Cloud API requests require authentication using an API key pair. You must include both the Account Key and Secret Key in request headers. API keys are created in the Redis Cloud console under Access Management > API Keys.

**Required Headers:**

```typescript
// Load credentials from environment
const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!
};

// Make authenticated request
const response = await fetch("https://api.redislabs.com/v1/subscriptions", {
  method: "GET",
  headers
});

if (response.ok) {
  const data = await response.json();
  console.log(`Found ${data.subscriptions?.length ?? 0} subscriptions`);
} else {
  console.error(`Error: ${response.status} - ${await response.text()}`);
}
```

| Header | Description |
|--------|-------------|
| `x-api-key` | Your Account Key (visible in console) |
| `x-api-secret-key` | Your Secret Key (shown only at creation time) |

**Best Practices:**

- Never hardcode API keys in source code; use environment variables or a secrets manager

- Store the secret key securely immediately after creation; it cannot be retrieved later

- Create separate API keys for different applications or environments

- Use the minimum required permissions when creating API keys

- Rotate API keys periodically and after any suspected compromise

- Consider IP allowlisting to restrict which IPs can use your API keys

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Verify API key and secret are correct |
| 403 | Forbidden | Check API key permissions or IP restrictions |

**Incorrect: Hardcoding credentials****

```python
# BAD: Never hardcode credentials
headers = {
    "x-api-key": "abc123",  # Don't do this!
    "x-api-secret-key": "secret456"
}
```

Reference: [https://redis.io/docs/latest/operate/rc/api/get-started/enable-the-api/](https://redis.io/docs/latest/operate/rc/api/get-started/enable-the-api/)

### 1.2 Handle Rate Limits and Throttling

**Impact: HIGH (Prevents request failures during high-volume operations)**

The Redis Cloud API enforces rate limits to ensure fair usage. When you exceed the limit, you'll receive a 429 (Too Many Requests) response. Implement exponential backoff to handle rate limiting gracefully.

**Rate Limit Response:**

```typescript
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
}

async function makeRequestWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 5, baseDelay = 1000 } = retryOptions;
  
  const headers = {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    ...options.headers
  };
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 429) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return response.json();
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded due to rate limiting`);
}

// Usage
const subscriptions = await makeRequestWithRetry<{ subscriptions: any[] }>(
  "https://api.redislabs.com/v1/subscriptions"
);
```

**Best Practices:**

- Always implement retry logic with exponential backoff for production applications

- Add jitter (random delay) to prevent thundering herd problems when multiple clients retry simultaneously

- Set a reasonable maximum number of retries (5-10) to avoid infinite loops

- Log rate limit events for monitoring and capacity planning

- Consider implementing request queuing for high-volume batch operations

- Avoid making unnecessary API calls; cache responses where appropriate

**Backoff Formula:**

```python
delay = base_delay * (2 ^ attempt) + random_jitter
```

Example with 1 second base delay:

- Attempt 1: ~1s

- Attempt 2: ~2s

- Attempt 3: ~4s

- Attempt 4: ~8s

- Attempt 5: ~16s

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 429 | Too Many Requests | Implement backoff and retry |

Reference: [https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/](https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/)

---

## 2. Async Operations

**Impact: HIGH**

Polling task status, listing tasks, understanding operation lifecycle, and handling async responses.

### 2.1 Poll Task Status for Async Operations

**Impact: HIGH (Required for tracking operation completion)**

Most Redis Cloud API write operations (create, update, delete) are asynchronous. They return immediately with a `taskId` that you must poll to track completion. The task API returns the operation status and, when complete, the resource ID.

**Async Response Structure:**

```json
{
  "taskId": "task-uuid-here",
  "commandType": "subscriptionCreateRequest",
  "status": "received",
  "description": "Task request received and is being processed",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Task Statuses:**

| Status | Meaning |
|--------|---------|
| `received` | Task received, not yet started |
| `processing-in-progress` | Task is being executed |
| `processing-completed` | Task completed successfully |
| `processing-error` | Task failed |

**Endpoint: `GET /tasks`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/tasks", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { tasks } = await response.json();
tasks.forEach((task: any) => {
  console.log(`Task ID: ${task.taskId}, Status: ${task.status}, Type: ${task.commandType ?? "N/A"}`);
});
```

List all tasks for the account with optional filtering.

**Endpoint: `GET /tasks/{taskId}`**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

function getHeaders(): Record<string, string> {
  return {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  };
}

interface TaskResponse {
  taskId: string;
  status: string;
  response?: {
    resourceId?: number;
    error?: {
      type?: string;
      description?: string;
    };
  };
}

async function waitForTask(
  taskId: string,
  pollInterval = 10000,
  timeout = 1800000
): Promise<any> {
  const startTime = Date.now();
  
  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
    }
    
    const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const task: TaskResponse = await response.json();
    console.log(`Task ${taskId}: ${task.status}`);
    
    if (task.status === "processing-completed") {
      return task.response;
    }
    
    if (task.status === "processing-error") {
      const error = task.response?.error;
      throw new Error(`Task failed: ${error?.description ?? "Unknown error"}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

async function createSubscription(payload: object): Promise<number> {
  // Start the async operation
  const response = await fetch(`${BASE_URL}/subscriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const { taskId } = await response.json();
  console.log(`Started task: ${taskId}`);
  
  // Wait for completion
  const result = await waitForTask(taskId);
  console.log(`Subscription created: ${result.resourceId}`);
  return result.resourceId;
}

// Usage
const subscriptionId = await createSubscription({
  name: "my-subscription",
  cloudProviders: [{
    provider: "AWS",
    regions: [{ region: "us-east-1" }]
  }],
  databases: [{
    name: "my-database",
    datasetSizeInGb: 1
  }]
});
```

**Best Practices:**

- Always poll the task API after any create, update, or delete operation

- Use reasonable poll intervals (10-30 seconds) to avoid rate limiting

- Implement timeouts to prevent indefinite waiting (30 minutes is typical for subscriptions)

- Store the `taskId` for later reference or debugging

- The `response.resourceId` contains the ID of the created/modified resource

- For subscription creation, database IDs are in `response.resource.databases[].databaseId`

**Dry Run Mode:**

```json
{
  "name": "test-subscription",
  "dryRun": true,
  ...
}
```

Use `"dryRun": true` in create requests to validate without actually creating resources:

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Task not found | Verify taskId is correct |
| `processing-error` | Operation failed | Check `response.error.description` for details |

Reference: [https://redis.io/docs/latest/operate/rc/api/get-started/process-lifecycle/](https://redis.io/docs/latest/operate/rc/api/get-started/process-lifecycle/)

---

## 3. Pro Subscriptions

**Impact: HIGH**

Creating and managing Redis Cloud Pro subscriptions with flexible configuration. Includes Active-Active region management and maintenance windows.

### 3.1 Configure Maintenance Windows

**Impact: MEDIUM (Control when maintenance operations occur)**

Maintenance windows control when Redis Cloud performs updates, patches, and other maintenance operations on your Pro subscriptions. Configure windows to minimize impact during peak usage.

**Endpoint: `GET /subscriptions/{subscriptionId}/maintenance-windows`****

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/maintenance-windows" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/maintenance-windows`****

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/maintenance-windows" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "manual",
    "windows": [
      {
        "days": ["Sunday"],
        "startHour": 2,
        "durationInHours": 4
      },
      {
        "days": ["Wednesday"],
        "startHour": 3,
        "durationInHours": 4
      }
    ]
  }'
```

**Switch to Automatic Mode:**

```typescript
const payload = {
  mode: "automatic"
  // No windows needed for automatic mode
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/maintenance-windows`,
  {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);
```

**Maintenance Window Configuration:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `automatic` or `manual` |
| `windows` | array | Required when mode is `manual` |
| `windows[].days` | array | Days of week (e.g., `["Sunday", "Wednesday"]`) |
| `windows[].startHour` | integer | Start hour in UTC (0-23) |
| `windows[].durationInHours` | integer | Window duration (minimum 4 hours) |

**Day Values:**

- `Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`

**Mode Comparison:**

| Mode | Description |
|------|-------------|
| `automatic` | Redis Cloud schedules maintenance as needed |
| `manual` | Maintenance only occurs during specified windows |

**Best Practices:**

- Set maintenance windows during low-traffic periods

- Configure at least 2 windows per week for timely updates

- Use UTC times and convert from your local timezone

- Minimum window duration is 4 hours

- Up to 7 windows can be configured

- Consider time zones for globally distributed teams

**Example: Weekend Maintenance:****

```json
{
  "mode": "manual",
  "windows": [
    {
      "days": ["Saturday", "Sunday"],
      "startHour": 2,
      "durationInHours": 6
    }
  ]
}
```

**Example: Weekday Off-Hours:****

```json
{
  "mode": "manual",
  "windows": [
    {
      "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "startHour": 3,
      "durationInHours": 4
    }
  ]
}
```

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check window configuration format |
| 404 | Not Found | Subscription doesn't exist |
| 422 | Unprocessable | Invalid day names or hours |

Reference: [https://redis.io/docs/latest/operate/rc/subscriptions/maintenance/](https://redis.io/docs/latest/operate/rc/subscriptions/maintenance/)

### 3.2 Create Pro Subscriptions

**Impact: HIGH (Foundation for hosting Pro databases)**

Create a new Redis Cloud Pro subscription with flexible configuration options. Pro subscriptions support advanced features like Active-Active geo-replication, custom cloud accounts, and fine-grained resource control. This is an async operation that returns a `taskId`.

**Endpoint: `POST /subscriptions`**

**Key Parameters:**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

// Create a Pro subscription
const payload = {
  name: "production-subscription",
  cloudProviders: [{
    provider: "AWS",
    regions: [{
      region: "us-east-1",
      multipleAvailabilityZones: true,
      networking: {
        deploymentCIDR: "10.0.0.0/24"
      }
    }]
  }],
  databases: [{
    name: "cache-db",
    protocol: "redis",
    datasetSizeInGb: 5,
    throughputMeasurement: {
      by: "operations-per-second",
      value: 10000
    },
    replication: true,
    modules: []
  }]
};

const response = await fetch(`${BASE_URL}/subscriptions`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload)
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}

const { taskId } = await response.json();
console.log(`Subscription creation started. Task ID: ${taskId}`);

// Poll task to get subscription ID (see tasks-async-operations rule)
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Subscription name |
| `dryRun` | boolean | No | Validate without creating (default: false) |
| `paymentMethodId` | integer | No | Payment method ID (uses default if omitted) |
| `cloudProviders` | array | Yes | Cloud provider and region configuration |
| `databases` | array | Yes | Initial databases to create |

**Cloud Provider Options:**

| Provider | Regions Examples |
|----------|-----------------|
| `AWS` | us-east-1, us-west-2, eu-west-1, ap-southeast-1 |
| `GCP` | us-central1, europe-west1, asia-east1 |
| `Azure` | eastus, westeurope, southeastasia |

**Database Configuration Options:**

| Field | Description |
|-------|-------------|
| `datasetSizeInGb` | Memory limit for dataset (1-1000+ GB) |
| `throughputMeasurement.by` | `operations-per-second` or `number-of-shards` |
| `replication` | Enable high availability (recommended: true) |
| `dataPersistence` | `none`, `aof-every-1-second`, `aof-every-write`, `snapshot-every-1-hour`, etc. |
| `modules` | Redis modules: `RedisJSON`, `RediSearch`, `RedisTimeSeries`, `RedisBloom` |

**Best Practices:**

- Use `dryRun: true` first to validate configuration without creating resources

- Always enable `multipleAvailabilityZones` for production workloads

- Choose a `deploymentCIDR` that doesn't conflict with your VPC if you plan to peer

- Start with estimated throughput; you can scale later

- Enable `replication` for high availability (doubles memory cost)

- Subscription creation typically takes 10-20 minutes

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check required fields and valid region names |
| 409 | Conflict | Subscription name already exists |
| 422 | Unprocessable | Invalid configuration (check modules, regions) |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Pro/operation/createSubscription](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Pro/operation/createSubscription)

### 3.3 Manage Active-Active Subscription Regions

**Impact: HIGH (Required for geo-distributed deployments)**

Active-Active subscriptions enable geo-distributed Redis deployments with automatic conflict resolution. Manage regions to add, remove, or query regions in an Active-Active subscription.

**Endpoint: `GET /subscriptions/{subscriptionId}/regions`****

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions`****

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "eu-west-1",
    "deploymentCIDR": "10.1.0.0/24"
  }'
```

Add a new region to an existing Active-Active subscription:

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions`****

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "regionIds": [67890, 67891]
  }'
```

Remove one or more regions from an Active-Active subscription:

**Region Response Fields:**

| Field | Description |
|-------|-------------|
| `regionId` | Unique region identifier |
| `region` | Cloud region name (e.g., us-east-1) |
| `status` | Region status (active, pending, deleting) |
| `networking.deploymentCIDR` | CIDR block for this region |
| `provider` | Cloud provider (AWS, GCP) |

**Active-Active Region Requirements:**

- At least 2 regions required for Active-Active

- Cannot delete all regions; at least one must remain

- Each region needs a unique, non-overlapping CIDR

- Adding regions is an async operation that can take 10-20 minutes

**Best Practices:**

- Plan CIDR blocks across all regions to avoid conflicts

- Use geographically distributed regions for latency optimization

- Add regions before creating databases that need them

- Monitor task status when adding/removing regions

- Consider network latency between regions for replication performance

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check region name is valid |
| 404 | Not Found | Subscription or region doesn't exist |
| 409 | Conflict | CIDR overlaps or region already exists |
| 422 | Unprocessable | Cannot delete last region |

Reference: [https://redis.io/docs/latest/operate/rc/databases/create-database/create-active-active-database/](https://redis.io/docs/latest/operate/rc/databases/create-database/create-active-active-database/)

### 3.4 Manage Pro Subscriptions

**Impact: HIGH (Update, retrieve, and delete Pro subscriptions)**

Retrieve, update, and delete existing Pro subscriptions. Use these operations to view subscription details, modify settings, or clean up unused resources.

**Endpoint: `GET /subscriptions`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/subscriptions", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { subscriptions } = await response.json();
subscriptions.forEach((sub: any) => {
  console.log(`ID: ${sub.id}, Name: ${sub.name}, Status: ${sub.status}`);
});
```

**Endpoint: `GET /subscriptions/{subscriptionId}`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const subscription = await response.json();
console.log(`Name: ${subscription.name}`);
console.log(`Status: ${subscription.status}`);
```

**Endpoint: `PUT /subscriptions/{subscriptionId}`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}`,
  {
    method: "PUT",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "updated-subscription-name",
      paymentMethodId: 67890
    })
  }
);

const { taskId } = await response.json();
console.log(`Update started. Task ID: ${taskId}`);
```

Updates are async and return a `taskId`. Only certain fields can be updated after creation.

**Endpoint: `DELETE /subscriptions/{subscriptionId}`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}`,
  {
    method: "DELETE",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Deletion started. Task ID: ${taskId}`);
```

Deletes are async. **All databases must be deleted first** before deleting a subscription.

**Endpoint: `GET /subscriptions/{subscriptionId}/cidr`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/cidr`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const cidrData = await response.json();
console.log(`Deployment CIDR: ${cidrData.deploymentCidr}`);
console.log(`CIDR Whitelist: ${cidrData.cidrWhitelist}`);
```

Get the CIDR whitelist for a subscription.

**Endpoint: `PUT /subscriptions/{subscriptionId}/cidr`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/cidr" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "cidrIps": ["10.0.0.0/16", "192.168.1.0/24"]
  }'
```

Update the CIDR whitelist for IP-based access control.

**Endpoint: `GET /subscriptions/{subscriptionId}/pricing`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/pricing`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const pricing = await response.json();
console.log(`Monthly cost: $${pricing.monthlyPrice?.toFixed(2) ?? "0.00"}`);
console.log(`Hourly cost: $${pricing.hourlyPrice?.toFixed(4) ?? "0.0000"}`);
```

Get current pricing information for a subscription.

**Subscription Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Subscription is being created |
| `active` | Subscription is ready for use |
| `deleting` | Subscription is being deleted |
| `error` | Subscription creation failed |

**Best Practices:**

- Check subscription status before performing operations

- Delete all databases before attempting to delete a subscription

- Poll task status after update/delete operations

- Use list endpoint to find subscription IDs if you don't have them stored

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Not Found | Subscription ID doesn't exist |
| 409 | Conflict | Cannot delete subscription with existing databases |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Pro](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Pro)

---

## 4. Essentials Subscriptions

**Impact: MEDIUM**

Creating and managing Redis Cloud Essentials subscriptions for simpler deployments.

### 4.1 Create Essentials Subscriptions

**Impact: MEDIUM (Simplified subscription for smaller workloads)**

Create a Redis Cloud Essentials subscription with predefined plans. Essentials subscriptions offer simpler configuration with fixed pricing tiers, ideal for development, testing, or smaller production workloads. This is an async operation.

**Endpoint: `POST /fixed/subscriptions`**

**Key Differences from Pro:**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

// First, get available plans
const plansResponse = await fetch(`${BASE_URL}/fixed/plans`, { headers });
const { plans } = await plansResponse.json();

// Filter plans by provider and region
const awsPlans = plans.filter(
  (p: any) => p.provider === "AWS" && p.region === "us-east-1"
);

awsPlans.slice(0, 5).forEach((plan: any) => {
  console.log(`Plan ${plan.id}: ${plan.name} - ${plan.size}MB, $${plan.price}/mo`);
});

// Create subscription with selected plan
const payload = {
  name: "dev-subscription",
  planId: awsPlans[0].id
};

const response = await fetch(`${BASE_URL}/fixed/subscriptions`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload)
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}

const { taskId } = await response.json();
console.log(`Subscription creation started. Task ID: ${taskId}`);
```

| Feature | Essentials | Pro |
|---------|-----------|-----|
| Pricing | Fixed tiers | Pay-per-use |
| Configuration | Predefined plans | Fully customizable |
| Cloud accounts | Redis-managed only | BYOA supported |
| VPC Peering | Limited | Full support |

**Endpoint: `GET /fixed/plans`**

```bash
# List all available Essentials plans
curl -X GET "https://api.redislabs.com/v1/fixed/plans" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Plan Response Fields:**

| Field | Description |
|-------|-------------|
| `id` | Plan ID to use when creating subscription |
| `name` | Human-readable plan name |
| `size` | Memory size in MB |
| `price` | Monthly price |
| `provider` | Cloud provider (AWS, GCP, Azure) |
| `region` | Cloud region |

**Best Practices:**

- Query available plans first to find the right size and region

- Use the plan's `id` field when creating subscriptions

- Essentials is cost-effective for datasets under 12GB

- Consider Pro for production workloads requiring advanced features

- Plan pricing varies by region; compare before selecting

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Invalid planId |
| 404 | Not Found | Plan doesn't exist |
| 409 | Conflict | Subscription name already exists |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Essentials](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Essentials)

### 4.2 Manage Essentials Subscriptions

**Impact: MEDIUM (Retrieve, update, and delete Essentials subscriptions)**

Retrieve, update, and delete existing Essentials subscriptions. Essentials subscriptions use the `/fixed/subscriptions` endpoint prefix.

**Endpoint: `GET /fixed/subscriptions`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/fixed/subscriptions", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { subscriptions } = await response.json();
subscriptions.forEach((sub: any) => {
  console.log(`ID: ${sub.id}, Name: ${sub.name}, Status: ${sub.status}`);
});
```

**Endpoint: `GET /fixed/subscriptions/{subscriptionId}`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const subscription = await response.json();
console.log(`Name: ${subscription.name}`);
console.log(`Status: ${subscription.status}`);
```

**Endpoint: `PUT /fixed/subscriptions/{subscriptionId}`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}`,
  {
    method: "PUT",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "renamed-subscription"
    })
  }
);

const { taskId } = await response.json();
console.log(`Update started. Task ID: ${taskId}`);
```

Essentials subscriptions have limited update options compared to Pro.

**Endpoint: `DELETE /fixed/subscriptions/{subscriptionId}`**

```typescript
const subscriptionId = 12345;

// First, delete all databases in the subscription
// (see db-ess-manage rule)

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}`,
  {
    method: "DELETE",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Deletion started. Task ID: ${taskId}`);
```

**Best Practices:**

- All databases must be deleted before deleting a subscription

- Poll task status after update/delete operations

- Essentials subscriptions cannot be upgraded to Pro; create a new Pro subscription and migrate data

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Not Found | Subscription ID doesn't exist |
| 409 | Conflict | Cannot delete subscription with existing databases |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Essentials](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Essentials)

---

## 5. Pro Databases

**Impact: HIGH**

Creating and managing databases within Pro subscriptions. Includes advanced features like Active-Active (CRDB) operations, backup, import, tags, and version upgrades.

### 5.1 Create Pro Databases

**Impact: HIGH (Provision databases with advanced features)**

Create a new database within an existing Pro subscription. Pro databases support advanced features like Redis modules, flexible persistence options, and fine-grained throughput control. This is an async operation.

**Endpoint: `POST /subscriptions/{subscriptionId}/databases`**

**Key Parameters:**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

const subscriptionId = 12345;

const payload = {
  name: "my-database",
  datasetSizeInGb: 5,
  throughputMeasurement: {
    by: "operations-per-second",
    value: 10000
  },
  replication: true,
  dataPersistence: "aof-every-1-second",
  modules: [
    { name: "RedisJSON" },
    { name: "RediSearch" }
  ],
  alerts: [
    { name: "dataset-size", value: 80 }
  ]
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  }
);

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}

const { taskId } = await response.json();
console.log(`Database creation started. Task ID: ${taskId}`);
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Database name (unique within subscription) |
| `protocol` | string | No | `redis` (default) or `memcached` |
| `datasetSizeInGb` | number | Yes | Memory limit for dataset |
| `throughputMeasurement` | object | No | Throughput configuration |
| `replication` | boolean | No | Enable high availability |
| `dataPersistence` | string | No | Persistence strategy |
| `modules` | array | No | Redis modules to enable |

**Data Persistence Options:**

| Value | Description |
|-------|-------------|
| `none` | No persistence (cache only) |
| `aof-every-1-second` | Append-only file, fsync every second |
| `aof-every-write` | Append-only file, fsync on every write |
| `snapshot-every-1-hour` | RDB snapshot every hour |
| `snapshot-every-6-hours` | RDB snapshot every 6 hours |
| `snapshot-every-12-hours` | RDB snapshot every 12 hours |

**Available Modules:**

| Module | Description |
|--------|-------------|
| `RedisJSON` | Native JSON support |
| `RediSearch` | Full-text search and secondary indexing |
| `RedisTimeSeries` | Time series data structure |
| `RedisBloom` | Probabilistic data structures |
| `RedisGraph` | Graph database (deprecated) |

**Alert Types:**

| Name | Description |
|------|-------------|
| `dataset-size` | Alert when dataset reaches X% of limit |
| `throughput-higher-than` | Alert when ops/sec exceeds threshold |
| `throughput-lower-than` | Alert when ops/sec drops below threshold |
| `latency` | Alert on high latency |
| `connections-limit` | Alert on connection limit reached |

**Best Practices:**

- Enable `replication` for production databases (provides HA)

- Use `aof-every-1-second` for durability with minimal performance impact

- Start with estimated throughput; scale up based on actual usage

- Add `dataset-size` alerts to catch capacity issues early

- Modules must be specified at creation time for some features

- Database names must be unique within a subscription

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check required fields and valid values |
| 404 | Not Found | Subscription ID doesn't exist |
| 409 | Conflict | Database name already exists in subscription |
| 422 | Unprocessable | Invalid module or persistence combination |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Pro/operation/createDatabase](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Pro/operation/createDatabase)

### 5.2 Database Operations (Backup, Import, Tags)

**Impact: MEDIUM (Essential for data management and organization)**

Additional database operations for Pro databases including on-demand backups, data import, tagging, SSL certificates, slow log analysis, and version upgrades.

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/backup`****

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/backup" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Trigger an immediate backup:

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/import`****

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/import" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "http",
    "importFromUri": ["https://storage.example.com/backup.rdb"]
  }'
```

Import data from an RDB file or another Redis instance:

**Import Source Types:**

| Type | Description |
|------|-------------|
| `http` | HTTP/HTTPS URL to RDB file |
| `aws-s3` | Amazon S3 bucket |
| `gcs` | Google Cloud Storage |
| `azure-blob-storage` | Azure Blob Storage |
| `ftp` | FTP server |
| `redis` | Another Redis instance |

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}/tags`****

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/tags" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/databases/{databaseId}/tags`****

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/tags" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": [
      {"key": "environment", "value": "production"},
      {"key": "team", "value": "backend"}
    ]
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/databases/{databaseId}/tags/{tagKey}`****

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/tags/environment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}/certificate`****

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/certificate" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Download the SSL/TLS certificate for secure connections:

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}/slow-log`****

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/slow-log" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Retrieve slow query log:

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/upgrade`****

```bash
# Check available versions
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/available-target-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"

# Upgrade
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/upgrade" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"targetRedisVersion": "7.2"}'
```

Upgrade Redis version:

**Best Practices:**

- Schedule regular backups for production databases

- Test import operations on non-production databases first

- Use tags for cost allocation and resource organization

- Download certificates for applications requiring TLS

- Review slow logs periodically to identify performance issues

- Test version upgrades in staging before production

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check payload format |
| 404 | Not Found | Database or tag doesn't exist |
| 409 | Conflict | Operation already in progress |
| 422 | Unprocessable | Invalid import source or version |

Reference: [https://redis.io/docs/latest/operate/rc/databases/back-up-data/](https://redis.io/docs/latest/operate/rc/databases/back-up-data/)

### 5.3 Manage Active-Active Databases (CRDB)

**Impact: HIGH (Required for geo-replicated database operations)**

Active-Active databases (also known as CRDBs - Conflict-free Replicated Databases) provide geo-distributed data replication with automatic conflict resolution. These operations manage database properties across regions.

**Endpoint: `PUT /subscriptions/{subscriptionId}/databases/{databaseId}/regions`****

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "regions": [
      {
        "regionId": 111,
        "localThroughputMeasurement": {
          "by": "operations-per-second",
          "value": 15000
        }
      }
    ]
  }'
```

Update Active-Active database properties for specific regions:

**Regional Properties:**

| Field | Description |
|-------|-------------|
| `regionId` | Region identifier (from GET regions) |
| `localThroughputMeasurement` | Throughput config for this region |
| `localDatasetSizeInGb` | Local memory allocation |

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/flush`****

```bash
# Flush all regions
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/flush" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# Flush specific regions
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/flush" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"regionIds": [111, 222]}'
```

Flush (delete all data from) an Active-Active database. For CRDB, you can flush specific regions:

**Active-Active Database Characteristics:**

| Feature | Description |
|---------|-------------|
| Conflict Resolution | Automatic using CRDTs |
| Replication | Bi-directional across all regions |
| Consistency | Eventual consistency with strong guarantees |
| Latency | Local reads, async cross-region writes |

**CRDT Data Types:**

Active-Active uses Conflict-free Replicated Data Types:

| Redis Type | CRDT Behavior |
|------------|---------------|
| Strings | Last-writer-wins |
| Counters | Add/remove tracking |
| Sets | Element tracking |
| Sorted Sets | Score and element tracking |
| Hashes | Field-level last-writer-wins |
| Lists | Add-only semantics |

**Best Practices:**

- Configure throughput per region based on regional traffic patterns

- Use higher throughput in regions with more writes

- Flush operations are destructive; use with caution in production

- Regional flush doesn't propagate; only affects specified regions

- Monitor replication lag between regions

**Incorrect: Flushing without confirmation****

```python
# BAD: No safeguard before destructive operation
response = requests.post(f"{BASE_URL}/.../flush", headers=headers, json={})

# BETTER: Add confirmation logic
if confirm_flush():
    response = requests.post(f"{BASE_URL}/.../flush", headers=headers, json={})
```

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check regionId values are valid |
| 404 | Not Found | Subscription, database, or region doesn't exist |
| 409 | Conflict | Database is busy with another operation |
| 422 | Unprocessable | Database is not Active-Active type |

Reference: [https://redis.io/docs/latest/operate/rc/databases/create-database/create-active-active-database/](https://redis.io/docs/latest/operate/rc/databases/create-database/create-active-active-database/)

### 5.4 Manage Pro Databases

**Impact: HIGH (Update, retrieve, and delete Pro databases)**

Retrieve, update, and delete databases within Pro subscriptions. Includes operations for listing, scaling, backup, and import.

**Endpoint: `GET /subscriptions/{subscriptionId}/databases`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/databases`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const data = await response.json();
const databases = data.subscription?.[0]?.databases ?? [];
databases.forEach((db: any) => {
  console.log(`ID: ${db.databaseId}, Name: ${db.name}, Status: ${db.status}`);
});
```

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/databases/${databaseId}`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const db = await response.json();
console.log(`Name: ${db.name}`);
console.log(`Endpoint: ${db.publicEndpoint ?? "N/A"}`);
console.log(`Password: ${db.security?.password ?? "N/A"}`);
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/databases/{databaseId}`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/databases/${databaseId}`,
  {
    method: "PUT",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      datasetSizeInGb: 10,
      throughputMeasurement: {
        by: "operations-per-second",
        value: 25000
      }
    })
  }
);

const { taskId } = await response.json();
console.log(`Update started. Task ID: ${taskId}`);
```

Scale memory, throughput, or modify settings. This is an async operation.

**Endpoint: `DELETE /subscriptions/{subscriptionId}/databases/{databaseId}`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/databases/${databaseId}`,
  {
    method: "DELETE",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Deletion started. Task ID: ${taskId}`);
```

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/backup`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/backup" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Trigger an immediate backup.

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/import`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/import" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "http",
    "importFromUri": ["https://example.com/backup.rdb"]
  }'
```

Import data from RDB file or another Redis instance.

**Database Response Fields:**

| Field | Description |
|-------|-------------|
| `databaseId` | Unique database identifier |
| `name` | Database name |
| `status` | Current status (active, pending, etc.) |
| `publicEndpoint` | Connection endpoint (host:port) |
| `security.password` | Database password |
| `memoryLimitInGb` | Configured memory limit |

**Best Practices:**

- Store the `databaseId` after creation for future operations

- Use the `publicEndpoint` and `password` to connect applications

- Enable regular backups for production databases

- Scale gradually; large jumps may take longer to provision

- Check status is `active` before connecting applications

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Not Found | Check subscription and database IDs |
| 409 | Conflict | Database is busy with another operation |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Pro](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Pro)

---

## 6. Essentials Databases

**Impact: MEDIUM**

Creating and managing databases within Essentials subscriptions. Includes operations like backup, import, tags, slow log, and version upgrades.

### 6.1 Create Essentials Databases

**Impact: MEDIUM (Provision databases in Essentials subscriptions)**

Create a new database within an Essentials subscription. Essentials databases have simpler configuration options compared to Pro. This is an async operation.

**Endpoint: `POST /fixed/subscriptions/{subscriptionId}/databases`**

**Key Parameters:**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

const subscriptionId = 12345;

const payload = {
  name: "my-essentials-db",
  dataPersistence: "aof-every-1-second",
  dataEvictionPolicy: "allkeys-lru",
  replication: true,
  enableDefaultUser: true,
  alerts: [
    { name: "datasets-size", value: 80 }
  ]
};

const response = await fetch(
  `${BASE_URL}/fixed/subscriptions/${subscriptionId}/databases`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  }
);

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}

const { taskId } = await response.json();
console.log(`Database creation started. Task ID: ${taskId}`);
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Database name |
| `protocol` | string | No | `redis` (default) or `memcached` |
| `dataPersistence` | string | No | Persistence strategy |
| `dataEvictionPolicy` | string | No | Eviction policy when memory is full |
| `replication` | boolean | No | Enable replication |
| `enableDefaultUser` | boolean | No | Enable default user authentication |

**Data Eviction Policies:**

| Policy | Description |
|--------|-------------|
| `volatile-lru` | Evict least recently used keys with TTL |
| `allkeys-lru` | Evict least recently used keys (any key) |
| `volatile-lfu` | Evict least frequently used keys with TTL |
| `allkeys-lfu` | Evict least frequently used keys (any key) |
| `volatile-random` | Evict random keys with TTL |
| `allkeys-random` | Evict random keys (any key) |
| `volatile-ttl` | Evict keys with shortest TTL |
| `noeviction` | Return error when memory is full |

**Best Practices:**

- Use `allkeys-lru` for cache workloads

- Use `noeviction` when data loss is unacceptable

- Enable `replication` for production workloads

- Database size is determined by the subscription plan

- Essentials databases don't support Redis modules; use Pro for modules

**Differences from Pro:**

- Memory size determined by subscription plan, not per-database

- No Redis modules support

- No custom throughput configuration

- Simpler pricing model

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check required fields |
| 404 | Not Found | Subscription ID doesn't exist |
| 409 | Conflict | Database name already exists |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Essentials](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Essentials)

### 6.2 Essentials Database Operations (Backup, Import, Tags)

**Impact: MEDIUM (Essential for Essentials database data management)**

Additional database operations for Essentials databases including on-demand backups, data import, tagging, slow log analysis, and version upgrades.

**Endpoint: `POST /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/backup`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/backup`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Backup started. Task ID: ${taskId}`);
```

**Endpoint: `POST /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/import`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const payload = {
  sourceType: "http",
  importFromUri: ["https://storage.example.com/backup.rdb"]
};

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/import`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Import started. Task ID: ${taskId}`);
```

**Import Source Types:**

| Type | Description |
|------|-------------|
| `http` | HTTP/HTTPS URL to RDB file |
| `aws-s3` | Amazon S3 bucket |
| `gcs` | Google Cloud Storage |
| `azure-blob-storage` | Azure Blob Storage |
| `ftp` | FTP server |

**Endpoint: `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/tags`**

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/tags" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/tags`**

```bash
curl -X PUT "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/tags" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": [
      {"key": "environment", "value": "development"},
      {"key": "team", "value": "frontend"}
    ]
  }'
```

**Endpoint: `DELETE /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/tags/{tagKey}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/tags/environment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/slow-log`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/slow-log`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { slowlog } = await response.json();
slowlog?.forEach((entry: any) => {
  console.log(`Command: ${entry.command}, Duration: ${entry.durationUsec}us`);
});
```

**Endpoint: `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/available-target-versions`**

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/available-target-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/upgrade`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

// First check available versions
const versionsResponse = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/available-target-versions`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);
const versions = await versionsResponse.json();
console.log("Available versions:", versions);

// Then upgrade
const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}/upgrade`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ targetRedisVersion: "7.2" })
  }
);

const { taskId } = await response.json();
console.log(`Upgrade started. Task ID: ${taskId}`);
```

**Slow Log Entry Fields:**

| Field | Description |
|-------|-------------|
| `command` | The slow command that was executed |
| `durationUsec` | Execution time in microseconds |
| `time` | Timestamp when the command was executed |
| `clientAddress` | Client IP that executed the command |

**Best Practices:**

- Schedule regular backups for data protection

- Test imports on non-production databases first

- Use tags for cost allocation and resource organization

- Review slow logs periodically to identify performance issues

- Check available versions before attempting upgrades

- Test version upgrades in staging before production

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check payload format |
| 404 | Not Found | Database or subscription doesn't exist |
| 409 | Conflict | Operation already in progress |
| 422 | Unprocessable | Invalid import source or version |

Reference: [https://redis.io/docs/latest/operate/rc/databases/](https://redis.io/docs/latest/operate/rc/databases/)

### 6.3 Manage Essentials Databases

**Impact: MEDIUM (Update, retrieve, and delete Essentials databases)**

Retrieve, update, and delete databases within Essentials subscriptions.

**Endpoint: `GET /fixed/subscriptions/{subscriptionId}/databases`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const data = await response.json();
const databases = data.subscription?.[0]?.databases ?? [];
databases.forEach((db: any) => {
  console.log(`ID: ${db.databaseId}, Name: ${db.name}, Status: ${db.status}`);
});
```

**Endpoint: `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const db = await response.json();
console.log(`Name: ${db.name}`);
console.log(`Endpoint: ${db.publicEndpoint ?? "N/A"}`);
```

**Endpoint: `PUT /fixed/subscriptions/{subscriptionId}/databases/{databaseId}`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`,
  {
    method: "PUT",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "renamed-database",
      dataPersistence: "aof-every-1-second",
      dataEvictionPolicy: "allkeys-lru"
    })
  }
);

const { taskId } = await response.json();
console.log(`Update started. Task ID: ${taskId}`);
```

Update database settings. Memory size cannot be changed; it's determined by the subscription plan.

**Endpoint: `DELETE /fixed/subscriptions/{subscriptionId}/databases/{databaseId}`**

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}/databases/${databaseId}`,
  {
    method: "DELETE",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Deletion started. Task ID: ${taskId}`);
```

**Best Practices:**

- Delete databases before deleting the parent subscription

- Poll task status after update/delete operations

- To scale memory, upgrade the subscription plan or migrate to Pro

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Not Found | Check subscription and database IDs |
| 409 | Conflict | Database is busy with another operation |

Reference: [https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Essentials](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Essentials)

---

## 7. Connectivity

**Impact: MEDIUM**

VPC peering, AWS Transit Gateway, AWS PrivateLink, and GCP Private Service Connect configuration. Includes Active-Active variants for multi-region deployments.

### 7.1 Configure AWS PrivateLink

**Impact: MEDIUM (Enable private connectivity on AWS without VPC peering)**

AWS PrivateLink provides private connectivity to Redis Cloud from your AWS VPC without requiring VPC peering. Traffic stays on the AWS network and doesn't traverse the public internet.

**Endpoint: `GET /subscriptions/{subscriptionId}/private-link`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-link`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Task ID: ${taskId}`);
// Poll task for PrivateLink configuration details
```

This is an async operation that returns a taskId.

**Endpoint: `POST /subscriptions/{subscriptionId}/private-link`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-link`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  }
);

const { taskId } = await response.json();
console.log(`PrivateLink creation started. Task ID: ${taskId}`);
```

Create a new PrivateLink configuration for your subscription.

**Endpoint: `DELETE /subscriptions/{subscriptionId}/private-link`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/private-link/principals`**

```typescript
const subscriptionId = 12345;

const payload = {
  principal: "arn:aws:iam::123456789012:root"
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-link/principals`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Principal added. Task ID: ${taskId}`);
```

Add an AWS principal (ARN) that is allowed to connect to your PrivateLink endpoint service.

**Endpoint: `DELETE /subscriptions/{subscriptionId}/private-link/principals`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principals": ["arn:aws:iam::123456789012:root"]
  }'
```

**Endpoint: `GET /subscriptions/{subscriptionId}/private-link/endpoint-script`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-link/endpoint-script" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Get a script to create the VPC endpoint in your AWS account.

**Endpoint: `PUT /subscriptions/{subscriptionId}/private-link/connections/disassociate`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/private-link/connections/disassociate" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointIds": ["vpce-0abc123def456789"]
  }'
```

Disassociate (disconnect) PrivateLink connections.

**PrivateLink Setup Workflow:**

1. Create PrivateLink configuration via API

2. Add your AWS account ARN as a principal

3. Get the endpoint script or service name

4. Create a VPC endpoint in your AWS account pointing to the service

5. Connect your applications using the private endpoint

**PrivateLink vs VPC Peering:**

| Feature | PrivateLink | VPC Peering |
|---------|-------------|-------------|
| CIDR management | Not required | Required |
| Direction | Unidirectional (your VPC to Redis) | Bidirectional |
| Transitive routing | Not supported | Not supported |
| Multiple VPCs | Each needs endpoint | Each needs peering |
| Setup complexity | Lower | Higher |

**Principal ARN Formats:**

| Type | Format |
|------|--------|
| Account root | `arn:aws:iam::123456789012:root` |
| IAM user | `arn:aws:iam::123456789012:user/username` |
| IAM role | `arn:aws:iam::123456789012:role/rolename` |

**Best Practices:**

- Use PrivateLink when you don't want to manage CIDR blocks

- Add only the minimum required principals

- PrivateLink provides better security isolation than VPC peering

- Use the endpoint script to simplify VPC endpoint creation

- PrivateLink is AWS-only; use PSC for GCP

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check principal ARN format |
| 404 | Not Found | PrivateLink not configured |
| 409 | Conflict | Principal already exists |

---

For Active-Active subscriptions, PrivateLink is managed per-region using region-specific endpoints.

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-link`**

```typescript
const subscriptionId = 12345;
const regionId = 111;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/${regionId}/private-link`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Task ID: ${taskId}`);
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-link`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-link`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-link/principals`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "arn:aws:iam::123456789012:root"
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-link/principals`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principals": ["arn:aws:iam::123456789012:root"]
  }'
```

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-link/endpoint-script`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/endpoint-script" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/regions/{regionId}/private-link/connections/disassociate`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/connections/disassociate" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointIds": ["vpce-0abc123def456789"]
  }'
```

**Standard vs Active-Active PrivateLink:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/private-link` | `/subscriptions/{id}/regions/{regionId}/private-link` |
| Scope | Subscription-wide | Per-region |
| Use case | Single-region subscription | Multi-region Active-Active |

Reference: [https://redis.io/docs/latest/operate/rc/security/private-link/](https://redis.io/docs/latest/operate/rc/security/private-link/)

### 7.2 Configure AWS Transit Gateway

**Impact: MEDIUM (Connect Redis Cloud to multiple VPCs via Transit Gateway)**

AWS Transit Gateway enables hub-and-spoke connectivity between Redis Cloud and multiple VPCs in your AWS account. This is useful when you need to connect Redis Cloud to many VPCs without creating individual peering connections.

**Endpoint: `GET /subscriptions/{subscriptionId}/transitGateways`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/transitGateways`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { transitGateways } = await response.json();
transitGateways.forEach((tgw: any) => {
  console.log(`ID: ${tgw.id}, TGW ID: ${tgw.awsTgwUid}, Status: ${tgw.status}`);
});
```

**Endpoint: `POST /subscriptions/{subscriptionId}/transitGateways`**

```typescript
const subscriptionId = 12345;

const payload = {
  awsTgwUid: "tgw-0abc123def456789",
  awsAccountId: "123456789012",
  cidrs: ["10.0.0.0/16", "10.1.0.0/16"]
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/transitGateways`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Transit Gateway registration started. Task ID: ${taskId}`);
```

First, share your Transit Gateway with Redis Cloud's AWS account using AWS Resource Access Manager (RAM).

**Endpoint: `PUT /subscriptions/{subscriptionId}/transitGateways/invitations/{tgwInvitationId}/accept`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/invitations/98765/accept" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

After registering the Transit Gateway, Redis Cloud creates a RAM resource share. Accept it:

**Endpoint: `POST /subscriptions/{subscriptionId}/transitGateways/{TgwId}/attachment`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

After accepting the resource share, create an attachment:

**Endpoint: `PUT /subscriptions/{subscriptionId}/transitGateways/{TgwId}/attachment`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "cidrs": ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/transitGateways/{TgwId}/attachment`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Transit Gateway Setup Workflow:**

1. Create a Transit Gateway in your AWS account

2. Share the Transit Gateway with Redis Cloud using AWS RAM

3. Register the Transit Gateway via API

4. Accept the resource share invitation via API

5. Create the Transit Gateway attachment via API

6. Configure Transit Gateway route tables in AWS

**Transit Gateway Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Registration in progress |
| `available` | Ready for attachment |
| `attached` | Attachment created and active |
| `failed` | Setup failed |

**Best Practices:**

- Use Transit Gateway when connecting to more than 2-3 VPCs

- Transit Gateway is AWS-only; use VPC peering for GCP

- Ensure the Transit Gateway is in the same region as your subscription

- Configure Transit Gateway route tables to route traffic to Redis Cloud

- CIDR blocks must not overlap with Redis Cloud's deployment CIDR

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check TGW ID format and CIDRs |
| 404 | Not Found | TGW not found or not shared |
| 409 | Conflict | Attachment already exists |

**Endpoint: `GET /subscriptions/{subscriptionId}/transitGateways/invitations`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/invitations" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

List pending Transit Gateway resource share invitations.

**Endpoint: `PUT /subscriptions/{subscriptionId}/transitGateways/invitations/{tgwInvitationId}/reject`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/invitations/98765/reject" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Reject a Transit Gateway resource share invitation.

---

For Active-Active subscriptions, Transit Gateway is managed per-region using region-specific endpoints.

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways`**

```typescript
const subscriptionId = 12345;
const regionId = 111;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/${regionId}/transitGateways`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { transitGateways } = await response.json();
transitGateways.forEach((tgw: any) => {
  console.log(`TGW ID: ${tgw.awsTgwUid}, Status: ${tgw.status}`);
});
```

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/invitations`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/invitations" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/invitations/{tgwInvitationId}/accept`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/invitations/98765/accept" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/invitations/{tgwInvitationId}/reject`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/invitations/98765/reject" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/{TgwId}/attachment`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/{TgwId}/attachment`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "cidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/{TgwId}/attachment`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Standard vs Active-Active Transit Gateway:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/transitGateways` | `/subscriptions/{id}/regions/{regionId}/transitGateways` |
| Scope | Subscription-wide | Per-region |
| Use case | Single-region subscription | Multi-region Active-Active |

Reference: [https://redis.io/docs/latest/operate/rc/security/aws-transit-gateway/](https://redis.io/docs/latest/operate/rc/security/aws-transit-gateway/)

### 7.3 Configure GCP Private Service Connect

**Impact: MEDIUM (Enable private connectivity on GCP without VPC peering)**

Private Service Connect (PSC) provides private connectivity to Redis Cloud from your GCP VPC without requiring VPC peering. PSC uses Google's private network and doesn't require managing CIDR blocks or route tables.

**Endpoint: `GET /subscriptions/{subscriptionId}/private-service-connect`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-service-connect`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { privateServiceConnectServices } = await response.json();
privateServiceConnectServices.forEach((psc: any) => {
  console.log(`ID: ${psc.id}, Status: ${psc.status}`);
});
```

**Endpoint: `POST /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints`**

```typescript
const subscriptionId = 12345;
const pscServiceId = 67890;

const payload = {
  gcpProjectId: "my-gcp-project",
  endpointConnectionName: "projects/my-gcp-project/regions/us-central1/forwardingRules/my-psc-endpoint"
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-service-connect/${pscServiceId}/endpoints`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`PSC endpoint creation started. Task ID: ${taskId}`);
```

After Redis Cloud creates a PSC service, create an endpoint to connect from your VPC:

**Endpoint: `PUT /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/updated-psc-endpoint"
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Private Service Connect Setup Workflow:**

1. Create a GCP subscription (PSC service is auto-created)

2. Get the PSC service attachment name via API

3. Create a PSC endpoint (forwarding rule) in your GCP project pointing to the service attachment

4. Register the endpoint via API

5. Use the private endpoint IP to connect to Redis

**PSC vs VPC Peering:**

| Feature | PSC | VPC Peering |
|---------|-----|-------------|
| CIDR management | Not required | Required |
| Route tables | Not required | Must configure |
| Transitive routing | Supported | Not supported |
| Setup complexity | Lower | Higher |
| Availability | GCP only | AWS, GCP |

**PSC Endpoint Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Endpoint registration in progress |
| `active` | Endpoint is connected |
| `rejected` | Endpoint connection was rejected |
| `failed` | Setup failed |

**Best Practices:**

- PSC is recommended over VPC peering for GCP subscriptions

- No CIDR planning or route table configuration required

- Create the forwarding rule in GCP console first, then register via API

- PSC endpoints can be in different projects than the VPC

- Use PSC for simpler network setup and better security isolation

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check endpoint name format |
| 404 | Not Found | PSC service not found |
| 409 | Conflict | Endpoint already registered |

**Endpoint: `GET /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Get details for a specific PSC service.

**Endpoint: `GET /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/creationScripts`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111/creationScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Get a script to create the PSC endpoint in your GCP project.

**Endpoint: `GET /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/deletionScripts`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111/deletionScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Get a script to delete the PSC endpoint from your GCP project.

---

For Active-Active subscriptions, PSC is managed per-region using region-specific endpoints.

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect`**

```typescript
const subscriptionId = 12345;
const regionId = 111;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/${regionId}/private-service-connect`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Task ID: ${taskId}`);
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "gcpProjectId": "my-gcp-project",
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/my-psc-endpoint"
  }'
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/updated-endpoint"
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/creationScripts`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111/creationScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/deletionScripts`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111/deletionScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Standard vs Active-Active PSC:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/private-service-connect` | `/subscriptions/{id}/regions/{regionId}/private-service-connect` |
| Scope | Subscription-wide | Per-region |
| Use case | Single-region subscription | Multi-region Active-Active |

Reference: [https://redis.io/docs/latest/operate/rc/security/private-service-connect/](https://redis.io/docs/latest/operate/rc/security/private-service-connect/)

### 7.4 Configure VPC Peering

**Impact: MEDIUM (Enable private connectivity between Redis Cloud and your VPC)**

VPC peering creates a private network connection between your Redis Cloud subscription and your cloud provider VPC. This enables secure communication without exposing traffic to the public internet.

**Endpoint: `GET /subscriptions/{subscriptionId}/peerings`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/peerings`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { peerings } = await response.json();
peerings.forEach((peer: any) => {
  console.log(`ID: ${peer.peeringId}, Status: ${peer.status}`);
});
```

**Endpoint: `POST /subscriptions/{subscriptionId}/peerings`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GCP",
    "gcpProjectId": "my-gcp-project",
    "networkName": "my-vpc-network"
  }'
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/peerings/{peeringId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "vpcCidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

Update the CIDR ranges for an existing peering.

**Endpoint: `DELETE /subscriptions/{subscriptionId}/peerings/{peeringId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**VPC Peering Workflow: AWS**

1. Create peering via API (Redis Cloud initiates peering request)

2. Poll task until `processing-completed`

3. Accept the peering request in your AWS console

4. Update your VPC route tables to route traffic to Redis Cloud CIDR

5. Peering status changes to `active`

**VPC Peering Workflow: GCP**

1. Create peering via API

2. Poll task until `processing-completed`

3. Peering is automatically established (no manual accept needed)

4. Configure firewall rules if necessary

**Peering Statuses:**

| Status | Description |
|--------|-------------|
| `initiating-request` | Peering request being created |
| `pending-acceptance` | Waiting for you to accept in cloud console |
| `active` | Peering is established and working |
| `inactive` | Peering exists but not routing traffic |
| `failed` | Peering creation failed |

**Best Practices:**

- Ensure your VPC CIDR doesn't overlap with Redis Cloud's deployment CIDR

- Configure subscription's `deploymentCIDR` during creation to avoid conflicts

- Accept peering requests promptly; they may expire

- Update route tables in your VPC after peering is active

- Use VPC peering instead of public endpoints for production workloads

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check VPC ID and CIDR format |
| 409 | Conflict | Peering already exists for this VPC |
| 422 | Unprocessable | CIDR overlap or invalid region |

---

For Active-Active subscriptions, VPC peering is managed per-region using region-specific endpoints.

**Endpoint: `GET /subscriptions/{subscriptionId}/regions/peerings`**

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/peerings`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { peerings } = await response.json();
peerings.forEach((peer: any) => {
  console.log(`Region: ${peer.regionId}, Peering ID: ${peer.peeringId}, Status: ${peer.status}`);
});
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions/peerings`**

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "regionId": 111,
    "provider": "AWS",
    "region": "us-east-1",
    "awsAccountId": "123456789012",
    "vpcId": "vpc-0abc123def456789",
    "vpcCidrs": ["10.0.0.0/16"]
  }'
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/regions/peerings/{peeringId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "vpcCidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions/peerings/{peeringId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Standard vs Active-Active VPC Peering:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/peerings` | `/subscriptions/{id}/regions/peerings` |
| Scope | Subscription-wide | Per-region |
| Region ID | Not required | Required in payload |

Reference: [https://redis.io/docs/latest/operate/rc/security/vpc-peering/](https://redis.io/docs/latest/operate/rc/security/vpc-peering/)

---

## 8. RBAC

**Impact: MEDIUM**

Role-based access control including ACL users, database access roles, and Redis ACL rules.

### 8.1 Manage ACL Users

**Impact: MEDIUM (Control database access with fine-grained user permissions)**

ACL (Access Control List) users are database-level users that can connect to Redis databases with specific permissions. Unlike account users who manage the Redis Cloud console, ACL users authenticate directly to Redis databases.

**Endpoint: `GET /acl/users`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/acl/users", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { users } = await response.json();
users.forEach((user: any) => {
  console.log(`ID: ${user.id}, Name: ${user.name}, Role: ${user.role ?? "N/A"}`);
});
```

**Endpoint: `GET /acl/users/{aclUserId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/acl/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /acl/users`**

```typescript
const payload = {
  name: "app-user",
  password: "SecurePassword123!",
  role: "db-member"
};

const response = await fetch("https://api.redislabs.com/v1/acl/users", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`ACL user creation started. Task ID: ${taskId}`);
```

**Endpoint: `PUT /acl/users/{aclUserId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/acl/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePassword456!",
    "role": "db-admin"
  }'
```

**Endpoint: `DELETE /acl/users/{aclUserId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/acl/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**ACL User vs Account User:**

| Feature | ACL User | Account User |
|---------|----------|--------------|
| Purpose | Database access | Console access |
| Scope | Specific databases | Account-wide |
| Authentication | Redis AUTH | Console login |
| Permissions | Redis commands | API/Console actions |

**Connecting with ACL User:**

```typescript
import { createClient } from "redis";

const client = createClient({
  url: "rediss://app-user:SecurePassword123!@redis-12345.c1.us-east-1.ec2.cloud.redislabs.com:12345"
});

await client.connect();
await client.set("key", "value");
```

**Best Practices:**

- Create separate ACL users for each application or service

- Use strong passwords and rotate them periodically

- Assign roles with minimum required permissions

- Don't share ACL users across environments (dev, staging, prod)

- Use ACL users instead of the default user for production

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check password requirements |
| 409 | Conflict | User name already exists |

Reference: [https://redis.io/docs/latest/operate/rc/security/access-control/data-access-control/role-based-access-control/](https://redis.io/docs/latest/operate/rc/security/access-control/data-access-control/role-based-access-control/)

### 8.2 Manage Database Access Roles

**Impact: MEDIUM (Define permission sets for ACL users)**

Database access roles define what Redis commands and key patterns ACL users can access. Roles are assigned to ACL users and can be associated with specific databases.

**Endpoint: `GET /acl/roles`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/acl/roles", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { roles } = await response.json();
roles.forEach((role: any) => {
  console.log(`ID: ${role.id}, Name: ${role.name}`);
});
```

**Endpoint: `GET /acl/roles/{aclRoleId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/acl/roles/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /acl/roles`**

```typescript
const payload = {
  name: "cache-reader",
  redisRules: [
    { ruleId: 11111 }
  ],
  databases: [
    { subscriptionId: 12345, databaseId: 67890 }
  ]
};

const response = await fetch("https://api.redislabs.com/v1/acl/roles", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`Role creation started. Task ID: ${taskId}`);
```

**Endpoint: `PUT /acl/roles/{aclRoleId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/acl/roles/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cache-reader-updated",
    "redisRules": [
      {"ruleId": 11111},
      {"ruleId": 22222}
    ],
    "databases": [
      {"subscriptionId": 12345, "databaseId": 67890},
      {"subscriptionId": 12345, "databaseId": 67891}
    ]
  }'
```

**Endpoint: `DELETE /acl/roles/{aclRoleId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/acl/roles/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Role Structure:**

```python
Role
├── name: "cache-reader"
├── redisRules: [Redis ACL rules defining permissions]
└── databases: [List of databases this role applies to]
```

**Role-Rule-Database Relationship:**

1. **Redis ACL Rules** define what commands/keys are allowed

2. **Roles** combine rules and associate them with databases

3. **ACL Users** are assigned roles to get permissions

**Best Practices:**

- Create roles for common access patterns (read-only, write-only, admin)

- Associate roles with specific databases rather than all databases

- Use separate roles for different application tiers

- Review and audit role assignments periodically

- Create Redis ACL rules first, then reference them in roles

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check ruleId and database references |
| 404 | Not Found | Role or referenced resource doesn't exist |
| 409 | Conflict | Role name already exists |

Reference: [https://redis.io/docs/latest/operate/rc/security/access-control/data-access-control/role-based-access-control/](https://redis.io/docs/latest/operate/rc/security/access-control/data-access-control/role-based-access-control/)

### 8.3 Manage Redis ACL Rules

**Impact: MEDIUM (Define fine-grained command and key permissions)**

Redis ACL rules define the specific Redis commands and key patterns that users can access. Rules use Redis ACL syntax and are referenced by roles.

**Endpoint: `GET /acl/redisRules`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/acl/redisRules", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { redisRules } = await response.json();
redisRules.forEach((rule: any) => {
  console.log(`ID: ${rule.id}, Name: ${rule.name}, ACL: ${rule.acl}`);
});
```

**Endpoint: `GET /acl/redisRules/{aclRedisRuleId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/acl/redisRules/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /acl/redisRules`**

```typescript
// Read-only rule for cache keys
const payload = {
  name: "read-only-cache",
  acl: "+@read ~cache:*"
};

const response = await fetch("https://api.redislabs.com/v1/acl/redisRules", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`Redis ACL rule creation started. Task ID: ${taskId}`);
```

**Endpoint: `PUT /acl/redisRules/{aclRedisRuleId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/acl/redisRules/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "acl": "+@read +@write ~cache:*"
  }'
```

**Endpoint: `DELETE /acl/redisRules/{aclRedisRuleId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/acl/redisRules/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**ACL Syntax Reference:**

| Syntax | Description | Example |
|--------|-------------|---------|
| `+@category` | Allow command category | `+@read` |
| `-@category` | Deny command category | `-@dangerous` |
| `+command` | Allow specific command | `+get` |
| `-command` | Deny specific command | `-flushdb` |
| `~pattern` | Allow key pattern | `~cache:*` |
| `&pattern` | Allow Pub/Sub channel | `&notifications:*` |

**Common Command Categories:**

| Category | Commands |
|----------|----------|
| `@read` | GET, MGET, HGET, LRANGE, etc. |
| `@write` | SET, MSET, HSET, LPUSH, etc. |
| `@admin` | CONFIG, DEBUG, SHUTDOWN, etc. |
| `@dangerous` | FLUSHALL, FLUSHDB, KEYS, etc. |
| `@fast` | O(1) commands |
| `@slow` | O(N) or higher commands |

**Example ACL Rules:**

```bash
# Read-only access to all keys
"+@read ~*"

# Read/write access to cache: prefix only
"+@read +@write ~cache:*"

# Full access except dangerous commands
"+@all -@dangerous ~*"

# Read-only with specific commands
"+get +mget +hget +hgetall ~*"

# Pub/Sub only
"+@pubsub &notifications:*"
```

**Best Practices:**

- Use the principle of least privilege

- Start with restrictive rules and add permissions as needed

- Use key patterns to limit access scope

- Avoid `~*` (all keys) in production unless necessary

- Test rules in development before applying to production

- Document what each rule is intended to allow

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Invalid ACL syntax |
| 409 | Conflict | Rule name already exists |

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)

---

## 9. Cloud Accounts

**Impact: LOW**

Managing AWS cloud accounts for BYOA (Bring Your Own Account) deployments.

### 9.1 Manage AWS Cloud Accounts

**Impact: LOW (Configure BYOA (Bring Your Own Account) for AWS deployments)**

Cloud accounts enable BYOA (Bring Your Own Account) deployments where Redis Cloud provisions resources in your AWS account instead of Redis-managed infrastructure. This provides greater control over billing, compliance, and network configuration.

**Endpoint: `GET /cloud-accounts`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/cloud-accounts", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { cloudAccounts } = await response.json();
cloudAccounts.forEach((account: any) => {
  console.log(`ID: ${account.id}, Name: ${account.name}, Status: ${account.status}`);
});
```

**Endpoint: `GET /cloud-accounts/{cloudAccountId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/cloud-accounts/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /cloud-accounts`**

```typescript
const payload = {
  name: "production-aws",
  provider: "AWS",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  accessSecretKey: process.env.AWS_SECRET_ACCESS_KEY!,
  consoleUsername: "redis-cloud-user",
  consolePassword: process.env.AWS_CONSOLE_PASSWORD!,
  signInLoginUrl: "https://123456789012.signin.aws.amazon.com/console"
};

const response = await fetch("https://api.redislabs.com/v1/cloud-accounts", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`Cloud account creation started. Task ID: ${taskId}`);
```

**Endpoint: `PUT /cloud-accounts/{cloudAccountId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/cloud-accounts/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-aws-renamed",
    "accessKeyId": "AKIAIOSFODNN7NEWKEY",
    "accessSecretKey": "newSecretKeyValue"
  }'
```

**Endpoint: `DELETE /cloud-accounts/{cloudAccountId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/cloud-accounts/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**AWS IAM Requirements:**

The IAM user/role needs these permissions:

- EC2 (instances, VPCs, security groups)

- S3 (for backups)

- CloudWatch (for monitoring)

- Auto Scaling

- IAM (limited, for service roles)

**Redis vs BYOA Comparison:**

| Feature | Redis-Managed | BYOA |
|---------|---------------|------|
| Billing | Redis invoices | Your AWS bill |
| Infrastructure control | Redis manages | You own resources |
| Compliance | Redis certifications | Your compliance scope |
| Network | Redis VPCs | Your VPCs |
| Availability | AWS only | AWS only |

**Cloud Account Statuses:**

| Status | Description |
|--------|-------------|
| `draft` | Account created but not validated |
| `active` | Account validated and ready |
| `error` | Validation failed |

**Best Practices:**

- Create a dedicated IAM user for Redis Cloud with minimum required permissions

- Use separate cloud accounts for different environments (dev, staging, prod)

- Rotate AWS credentials periodically

- Never commit AWS credentials to source control

- Test cloud account validation before creating subscriptions

- BYOA is only available for Pro subscriptions

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check AWS credentials format |
| 403 | Forbidden | IAM permissions insufficient |
| 409 | Conflict | Cloud account name already exists |

Reference: [https://redis.io/docs/latest/operate/rc/cloud-integrations/aws-cloud-accounts/](https://redis.io/docs/latest/operate/rc/cloud-integrations/aws-cloud-accounts/)

---

## 10. Account Management

**Impact: LOW**

Managing account users, reference data (regions, modules, versions), audit logs, session logs, and cost reports.

### 10.1 Audit and Session Logs

**Impact: LOW (Monitor account activity and API usage)**

Access audit logs and session logs to monitor account activity, track API usage, and support compliance requirements.

**Endpoint: `GET /logs`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/logs", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { logs } = await response.json();
logs.forEach((log: any) => {
  console.log(`Time: ${log.timestamp}`);
  console.log(`Action: ${log.action}`);
  console.log(`User: ${log.user?.email ?? "N/A"}`);
  console.log(`Resource: ${log.resource ?? "N/A"}`);
  console.log("---");
});
```

Returns audit logs for account activities including subscription changes, database operations, and user management.

**Endpoint: `GET /session-logs`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/session-logs", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { sessions } = await response.json();
sessions.forEach((session: any) => {
  console.log(`Session ID: ${session.sessionId}`);
  console.log(`User: ${session.user?.email ?? "N/A"}`);
  console.log(`IP Address: ${session.ipAddress ?? "N/A"}`);
  console.log(`Start Time: ${session.startTime}`);
  console.log("---");
});
```

Returns session logs for API and console access sessions.

**Audit Log Entry Fields:**

| Field | Description |
|-------|-------------|
| `timestamp` | When the action occurred |
| `action` | Type of action performed |
| `user` | User who performed the action |
| `resource` | Resource that was affected |
| `resourceId` | ID of the affected resource |
| `details` | Additional action details |
| `status` | Success or failure status |

**Common Audit Actions:**

| Action | Description |
|--------|-------------|
| `subscription.create` | Subscription created |
| `subscription.update` | Subscription modified |
| `subscription.delete` | Subscription deleted |
| `database.create` | Database created |
| `database.update` | Database modified |
| `database.delete` | Database deleted |
| `user.invite` | User invited to account |
| `user.remove` | User removed from account |
| `apiKey.create` | API key created |
| `apiKey.delete` | API key deleted |

**Session Log Entry Fields:**

| Field | Description |
|-------|-------------|
| `sessionId` | Unique session identifier |
| `user` | User associated with session |
| `ipAddress` | Client IP address |
| `userAgent` | Client user agent string |
| `startTime` | Session start timestamp |
| `endTime` | Session end timestamp (null if active) |
| `type` | Session type (api, console) |

**Use Cases:**

| Use Case | Log Type |
|----------|----------|
| Security auditing | Audit logs |
| Compliance reporting | Audit logs |
| Track configuration changes | Audit logs |
| Monitor API usage | Session logs |
| Detect unauthorized access | Both |
| Debug API issues | Session logs |

**Best Practices:**

- Regularly review audit logs for unexpected changes

- Monitor session logs for unusual IP addresses

- Export logs periodically for long-term retention

- Set up alerts for critical actions (deletions, permission changes)

- Use logs to track changes during incident investigation

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | API key lacks log access permission |

Reference: [https://redis.io/docs/latest/operate/rc/security/](https://redis.io/docs/latest/operate/rc/security/)

### 10.2 Cost Reports

**Impact: LOW (Track and analyze Redis Cloud spending)**

Access cost reports to track spending, analyze resource usage, and support financial planning for Redis Cloud deployments.

**Endpoint: `GET /cost-report`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/cost-report", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { costReports } = await response.json();
costReports.forEach((report: any) => {
  console.log(`Report ID: ${report.id}`);
  console.log(`Period: ${report.period}`);
  console.log(`Total Cost: $${report.totalCost?.toFixed(2) ?? "0.00"}`);
  console.log("---");
});
```

Returns available cost reports for the account.

**Endpoint: `GET /cost-report/{costReportId}`**

```typescript
const costReportId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/cost-report/${costReportId}`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const report = await response.json();
console.log(`Report ID: ${report.id}`);
console.log(`Period: ${report.period}`);
console.log(`Total Cost: $${report.totalCost?.toFixed(2) ?? "0.00"}`);

// Breakdown by subscription
report.subscriptions?.forEach((sub: any) => {
  console.log(`\nSubscription: ${sub.name} (ID: ${sub.id})`);
  console.log(`  Cost: $${sub.cost?.toFixed(2) ?? "0.00"}`);
  
  // Breakdown by database
  sub.databases?.forEach((db: any) => {
    console.log(`    Database: ${db.name} - $${db.cost?.toFixed(2) ?? "0.00"}`);
  });
});
```

Returns detailed breakdown for a specific cost report.

**Cost Report Fields:**

| Field | Description |
|-------|-------------|
| `id` | Unique report identifier |
| `period` | Billing period (e.g., "2024-01") |
| `totalCost` | Total cost for the period |
| `currency` | Currency code (e.g., "USD") |
| `subscriptions` | Breakdown by subscription |
| `generatedAt` | When the report was generated |

**Subscription Cost Breakdown:**

| Field | Description |
|-------|-------------|
| `id` | Subscription ID |
| `name` | Subscription name |
| `cost` | Total subscription cost |
| `databases` | Breakdown by database |
| `networkCost` | Network transfer costs |
| `storageCost` | Backup storage costs |

**Database Cost Breakdown:**

| Field | Description |
|-------|-------------|
| `id` | Database ID |
| `name` | Database name |
| `cost` | Total database cost |
| `memoryCost` | Memory allocation cost |
| `throughputCost` | Throughput cost |

**Use Cases:**

| Use Case | Approach |
|----------|----------|
| Monthly billing review | List reports, get current month |
| Cost allocation by team | Use database tags + report breakdown |
| Budget tracking | Compare report totals to budget |
| Chargeback | Export subscription/database costs |
| Cost optimization | Identify high-cost databases |

**Example: Calculate Cost by Tag****

```python
# Assuming you've tagged databases with "team" tag
def get_costs_by_team(report):
    team_costs = {}
    
    for sub in report.get("subscriptions", []):
        for db in sub.get("databases", []):
            # You'd need to fetch database details to get tags
            team = db.get("tags", {}).get("team", "untagged")
            team_costs[team] = team_costs.get(team, 0) + db.get("cost", 0)
    
    return team_costs

# Print costs by team
costs_by_team = get_costs_by_team(report)
for team, cost in costs_by_team.items():
    print(f"{team}: ${cost:.2f}")
```

**Best Practices:**

- Review cost reports monthly to track spending trends

- Use database tags to enable cost allocation by team or project

- Set up alerts when costs exceed thresholds

- Compare Pro vs Essentials costs for optimization opportunities

- Export reports for integration with finance systems

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | API key lacks billing access |
| 404 | Not Found | Report ID doesn't exist |

Reference: [https://redis.io/docs/latest/operate/rc/billing-and-payments/](https://redis.io/docs/latest/operate/rc/billing-and-payments/)

### 10.3 Manage Account Users

**Impact: LOW (Control who can access the Redis Cloud console and API)**

Account users are team members who can access the Redis Cloud console and API. Unlike ACL users (who access databases), account users manage subscriptions, databases, and other cloud resources.

**Endpoint: `GET /users`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/users", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { users } = await response.json();
users.forEach((user: any) => {
  console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
});
```

**Endpoint: `GET /users/{userId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /`**

```bash
curl -X GET "https://api.redislabs.com/v1/" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Returns information about the current account (the one associated with the API key).

**Endpoint: `POST /users`**

```typescript
const payload = {
  name: "Jane Developer",
  email: "jane@example.com",
  role: "member"
};

const response = await fetch("https://api.redislabs.com/v1/users", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`User invitation started. Task ID: ${taskId}`);
```

**Endpoint: `PUT /users/{userId}`**

```bash
curl -X PUT "https://api.redislabs.com/v1/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Senior Developer",
    "role": "owner"
  }'
```

**Endpoint: `DELETE /users/{userId}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Account User Roles:**

| Role | Description |
|------|-------------|
| `owner` | Full access, can manage billing and users |
| `member` | Can manage subscriptions and databases |
| `viewer` | Read-only access to all resources |

**Account User vs ACL User:**

| Feature | Account User | ACL User |
|---------|--------------|----------|
| Access to | Console & API | Database only |
| Authentication | Email/password, SSO | Redis AUTH |
| Purpose | Manage infrastructure | Run Redis commands |
| Scope | Account-wide | Database-specific |

**User Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Invitation sent, not yet accepted |
| `active` | User has accepted and can access |
| `suspended` | Access temporarily disabled |

**Best Practices:**

- Use the principle of least privilege when assigning roles

- Remove users promptly when they leave the organization

- Use `viewer` role for stakeholders who only need to monitor

- Owner role should be limited to account administrators

- Consider using SSO for enterprise deployments

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check email format and role |
| 409 | Conflict | User with this email already exists |

Reference: [https://redis.io/docs/latest/operate/rc/security/access-control/access-management/](https://redis.io/docs/latest/operate/rc/security/access-control/access-management/)

### 10.4 Reference Data and Account Information

**Impact: LOW (Lookup data for subscription and database configuration)**

Reference endpoints provide lookup data for configuring subscriptions and databases, including available regions, Redis modules, persistence options, Redis versions, and payment methods.

**Endpoint: `GET /`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const account = await response.json();
console.log(`Account ID: ${account.id}`);
console.log(`Account Name: ${account.name}`);
```

Returns information about the current account associated with the API key.

**Endpoint: `GET /regions`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/regions", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { regions } = await response.json();
regions.forEach((region: any) => {
  console.log(`Provider: ${region.provider}, Region: ${region.name}`);
});
```

Returns all cloud regions available for Redis Cloud deployments.

**Endpoint: `GET /database-modules`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/database-modules", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { modules } = await response.json();
modules.forEach((module: any) => {
  console.log(`Module: ${module.name}`);
});
```

Returns available Redis modules that can be enabled on databases.

**Available Modules:**

| Module | Description |
|--------|-------------|
| `RedisJSON` | Native JSON data type support |
| `RediSearch` | Full-text search and secondary indexing |
| `RedisTimeSeries` | Time series data structure |
| `RedisBloom` | Probabilistic data structures |
| `RedisGraph` | Graph database (deprecated) |

**Endpoint: `GET /data-persistence`**

```bash
curl -X GET "https://api.redislabs.com/v1/data-persistence" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Returns available data persistence configurations.

**Persistence Options:**

| Value | Description |
|-------|-------------|
| `none` | No persistence (cache only) |
| `aof-every-1-second` | AOF, fsync every second |
| `aof-every-write` | AOF, fsync on every write |
| `snapshot-every-1-hour` | RDB snapshot every hour |
| `snapshot-every-6-hours` | RDB snapshot every 6 hours |
| `snapshot-every-12-hours` | RDB snapshot every 12 hours |

**Endpoint: `GET /subscriptions/redis-versions`**

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/redis-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Returns available Redis versions for Pro subscriptions.

**Endpoint: `GET /fixed/redis-versions`**

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/redis-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Returns available Redis versions for Essentials subscriptions.

**Endpoint: `GET /payment-methods`**

```typescript
const response = await fetch("https://api.redislabs.com/v1/payment-methods", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { paymentMethods } = await response.json();
paymentMethods.forEach((method: any) => {
  console.log(`ID: ${method.id}, Type: ${method.type}`);
});
```

Returns configured payment methods for the account.

**Endpoint: `GET /query-performance-factors`**

```bash
curl -X GET "https://api.redislabs.com/v1/query-performance-factors" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Returns factors that affect query performance for capacity planning.

**Endpoint: `GET /fixed/plans/{planId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/plans/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Get details for a specific Essentials plan.

**Endpoint: `GET /fixed/plans/subscriptions/{subscriptionId}`**

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/plans/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Get available plans for upgrading an existing Essentials subscription.

**Use Cases:**

| Endpoint | Use Case |
|----------|----------|
| `/regions` | List regions when creating subscriptions |
| `/database-modules` | Check module availability before enabling |
| `/data-persistence` | Select persistence option for databases |
| `/subscriptions/redis-versions` | Check versions before upgrading |
| `/payment-methods` | Get payment method ID for subscriptions |
| `/fixed/plans` | Select plan for Essentials subscriptions |

**Best Practices:**

- Cache reference data locally to reduce API calls

- Check region availability before creating subscriptions

- Verify module compatibility with your Redis version

- Use payment method IDs from this endpoint when creating subscriptions

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Check API credentials |
| 404 | Not Found | Resource doesn't exist |

Reference: [https://redis.io/docs/latest/operate/rc/api/](https://redis.io/docs/latest/operate/rc/api/)

---

## 11. Error Handling

**Impact: HIGH**

Understanding error codes, implementing retries, and handling common failure scenarios.

### 11.1 Handle API Errors and Retries

**Impact: HIGH (Build resilient applications that handle failures gracefully)**

The Redis Cloud API returns standard HTTP status codes and JSON error responses. Implementing proper error handling ensures your applications can recover from failures and provide meaningful feedback.

**Error Response Format:**

```typescript
class RedisCloudAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(`HTTP ${statusCode}: ${message}`);
    this.name = "RedisCloudAPIError";
  }
}

class RedisCloudClient {
  private readonly baseUrl = "https://api.redislabs.com/v1";
  private readonly retryableCodes = new Set([408, 429, 500, 503]);
  private readonly headers: Record<string, string>;
  
  constructor() {
    this.headers = {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    };
  }
  
  async request<T>(
    method: string,
    path: string,
    options: {
      body?: object;
      maxRetries?: number;
      baseDelay?: number;
    } = {}
  ): Promise<T> {
    const { body, maxRetries = 5, baseDelay = 1000 } = options;
    const url = `${this.baseUrl}${path}`;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: body ? JSON.stringify(body) : undefined
        });
        
        // Success
        if (response.ok) {
          const text = await response.text();
          return text ? JSON.parse(text) : null;
        }
        
        // Parse error
        let message: string;
        try {
          const errorData = await response.json();
          message = errorData.message ?? response.statusText;
        } catch {
          message = response.statusText;
        }
        
        // Retryable error
        if (this.retryableCodes.has(response.status)) {
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Retryable error ${response.status}. ` +
              `Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        
        throw new RedisCloudAPIError(response.status, message);
        
      } catch (e) {
        if (e instanceof RedisCloudAPIError) throw e;
        
        // Network error - retry
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Network error: ${e}. Retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw e;
      }
    }
    
    throw new RedisCloudAPIError(0, "Max retries exceeded");
  }
}

// Usage
const client = new RedisCloudClient();

try {
  const data = await client.request<{ subscriptions: any[] }>("GET", "/subscriptions");
  console.log(`Found ${data.subscriptions.length} subscriptions`);
} catch (e) {
  if (e instanceof RedisCloudAPIError) {
    switch (e.statusCode) {
      case 401:
        console.error("Check your API credentials");
        break;
      case 403:
        console.error("API key lacks permission or IP is blocked");
        break;
      case 404:
        console.error("Resource not found");
        break;
      default:
        console.error(`API error: ${e.message}`);
    }
  } else {
    throw e;
  }
}
```

| Code | Name | Retryable | Description |
|------|------|-----------|-------------|
| 400 | Bad Request | No | Invalid request format or parameters |
| 401 | Unauthorized | No | Invalid or missing API credentials |
| 403 | Forbidden | No | API key lacks permission or IP restricted |
| 404 | Not Found | No | Resource doesn't exist |
| 408 | Request Timeout | Yes | Server timeout, retry with backoff |
| 409 | Conflict | Maybe | Resource conflict (check message) |
| 412 | Precondition Failed | No | Feature flag disabled |
| 422 | Unprocessable Entity | No | Valid syntax but invalid semantics |
| 429 | Too Many Requests | Yes | Rate limited, retry with backoff |
| 500 | Internal Server Error | Yes | Server error, retry with backoff |
| 503 | Service Unavailable | Yes | Temporary outage, retry with backoff |

**401 Unauthorized:**

```python
Check:
- API key is correctly set
- Secret key is correctly set
- Keys have not been rotated or deleted
```

**403 Forbidden:**

```python
Check:
- API key has required permissions
- Your IP is in the allowlist (if IP restrictions enabled)
- Feature is available for your account tier
```

**409 Conflict:**

```python
Check:
- Resource name already exists (subscriptions, databases)
- Resource is in use (can't delete subscription with databases)
- Concurrent operation in progress
```

**422 Unprocessable Entity:**

```python
Check:
- Region is valid for your cloud provider
- Module combination is supported
- CIDR doesn't conflict with existing configuration
```

**Best Practices:**

- Always implement retry logic for 408, 429, 500, 503 errors

- Use exponential backoff with jitter to prevent thundering herd

- Log error details for debugging (but sanitize credentials)

- Handle 409 conflicts by checking current state before retrying

- Set reasonable timeouts to avoid hanging requests

- Monitor error rates to detect systemic issues

**Debugging Tips:**

```bash
# Include response headers for debugging
curl -v -X GET "https://api.redislabs.com/v1/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"

# Check task status for failed async operations
curl -X GET "https://api.redislabs.com/v1/tasks/$TASK_ID" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Reference: [https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/](https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/)

---

## References

1. [https://redis.io/docs/latest/operate/rc/api/](https://redis.io/docs/latest/operate/rc/api/)
2. [https://redis.io/docs/latest/operate/rc/api/api-reference/](https://redis.io/docs/latest/operate/rc/api/api-reference/)
3. [https://redis.io/docs/latest/operate/rc/api/get-started/](https://redis.io/docs/latest/operate/rc/api/get-started/)
4. [https://redis.io/docs/latest/operate/rc/api/get-started/process-lifecycle/](https://redis.io/docs/latest/operate/rc/api/get-started/process-lifecycle/)
