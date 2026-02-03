---
title: Database Operations (Backup, Import, Tags)
impact: MEDIUM
impactDescription: Essential for data management and organization
tags: backup, import, tags, certificates, slow-log, upgrade
---

## Database Operations (Backup, Import, Tags)

Additional database operations for Pro databases including on-demand backups, data import, tagging, SSL certificates, slow log analysis, and version upgrades.

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/backup`**

Trigger an immediate backup:

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

const subscriptionId = 12345;
const databaseId = 67890;

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/backup`,
  {
    method: "POST",
    headers
  }
);

const { taskId } = await response.json();
console.log(`Backup started. Task ID: ${taskId}`);
```

```python
import os
import requests

BASE_URL = "https://api.redislabs.com/v1"
headers = {
    "x-api-key": os.environ["REDIS_API_KEY"],
    "x-api-secret-key": os.environ["REDIS_API_SECRET"]
}

subscription_id = 12345
database_id = 67890

response = requests.post(
    f"{BASE_URL}/subscriptions/{subscription_id}/databases/{database_id}/backup",
    headers=headers
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Backup started. Task ID: {task_id}")
```

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/backup" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/import`**

Import data from an RDB file or another Redis instance:

```typescript
// Import from HTTP URL
const payload = {
  sourceType: "http",
  importFromUri: ["https://storage.example.com/backup.rdb"]
};

// Or import from AWS S3
const payloadS3 = {
  sourceType: "aws-s3",
  importFromUri: ["s3://my-bucket/backup.rdb"]
};

// Or import from another Redis
const payloadRedis = {
  sourceType: "redis",
  importFromUri: ["redis://user:password@source-redis.example.com:6379"]
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/import`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Import started. Task ID: ${taskId}`);
```

```python
# Import from HTTP URL
payload = {
    "sourceType": "http",
    "importFromUri": ["https://storage.example.com/backup.rdb"]
}

# Or import from AWS S3
# payload = {
#     "sourceType": "aws-s3",
#     "importFromUri": ["s3://my-bucket/backup.rdb"]
# }

response = requests.post(
    f"{BASE_URL}/subscriptions/{subscription_id}/databases/{database_id}/import",
    headers={**headers, "Content-Type": "application/json"},
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Import started. Task ID: {task_id}")
```

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

**Import Source Types:**

| Type | Description |
|------|-------------|
| `http` | HTTP/HTTPS URL to RDB file |
| `aws-s3` | Amazon S3 bucket |
| `gcs` | Google Cloud Storage |
| `azure-blob-storage` | Azure Blob Storage |
| `ftp` | FTP server |
| `redis` | Another Redis instance |

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}/tags`**

```typescript
const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/tags`,
  { headers }
);

const { tags } = await response.json();
tags?.forEach((tag: any) => {
  console.log(`${tag.key}: ${tag.value}`);
});
```

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/tags" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/databases/{databaseId}/tags`**

```typescript
const payload = {
  tags: [
    { key: "environment", value: "production" },
    { key: "team", value: "backend" },
    { key: "cost-center", value: "engineering" }
  ]
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/tags`,
  {
    method: "PUT",
    headers,
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Tags update started. Task ID: ${taskId}`);
```

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

**Endpoint: `DELETE /subscriptions/{subscriptionId}/databases/{databaseId}/tags/{tagKey}`**

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/tags/environment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}/certificate`**

Download the SSL/TLS certificate for secure connections:

```typescript
const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/certificate`,
  { headers }
);

const { certificate } = await response.json();
console.log("Certificate:", certificate);
// Save to file for TLS connections
```

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/certificate" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `GET /subscriptions/{subscriptionId}/databases/{databaseId}/slow-log`**

Retrieve slow query log:

```typescript
const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/slow-log`,
  { headers }
);

const { slowlog } = await response.json();
slowlog?.forEach((entry: any) => {
  console.log(`Command: ${entry.command}`);
  console.log(`Duration: ${entry.durationUsec}us`);
  console.log(`Time: ${entry.time}`);
});
```

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/slow-log" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/upgrade`**

Upgrade Redis version:

```typescript
// First, check available versions
const versionsResponse = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/available-target-versions`,
  { headers }
);
const { versions } = await versionsResponse.json();
console.log("Available versions:", versions);

// Then upgrade
const payload = {
  targetRedisVersion: "7.2"
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/upgrade`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Upgrade started. Task ID: ${taskId}`);
```

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
