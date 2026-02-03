---
title: Essentials Database Operations (Backup, Import, Tags)
impact: MEDIUM
impactDescription: Essential for Essentials database data management
tags: essentials, backup, import, tags, slow-log, upgrade, operations
---

## Essentials Database Operations (Backup, Import, Tags)

Additional database operations for Essentials databases including on-demand backups, data import, tagging, slow log analysis, and version upgrades.

### Trigger Backup

**Endpoint:** `POST /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/backup`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/backup" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

subscription_id = 12345
database_id = 67890

response = requests.post(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}/databases/{database_id}/backup",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Backup started. Task ID: {task_id}")
```

#### TypeScript

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

### Import Data

**Endpoint:** `POST /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/import`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/import" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceType": "http",
    "importFromUri": ["https://storage.example.com/backup.rdb"]
  }'
```

#### Python

```python
subscription_id = 12345
database_id = 67890

payload = {
    "sourceType": "http",
    "importFromUri": ["https://storage.example.com/backup.rdb"]
}

response = requests.post(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}/databases/{database_id}/import",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Import started. Task ID: {task_id}")
```

#### TypeScript

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

### Get Tags

**Endpoint:** `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/tags`

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/tags" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Update Tags

**Endpoint:** `PUT /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/tags`

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

### Delete Tag

**Endpoint:** `DELETE /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/tags/{tagKey}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/tags/environment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Slow Log

**Endpoint:** `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/slow-log`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/slow-log" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345
database_id = 67890

response = requests.get(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}/databases/{database_id}/slow-log",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

slowlog = response.json().get("slowlog", [])
for entry in slowlog:
    print(f"Command: {entry['command']}")
    print(f"Duration: {entry['durationUsec']}us")
    print(f"Time: {entry['time']}")
    print("---")
```

#### TypeScript

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

### Get Available Target Versions

**Endpoint:** `GET /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/available-target-versions`

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/available-target-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Upgrade Redis Version

**Endpoint:** `POST /fixed/subscriptions/{subscriptionId}/databases/{databaseId}/upgrade`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases/67890/upgrade" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "targetRedisVersion": "7.2"
  }'
```

#### Python

```python
subscription_id = 12345
database_id = 67890

# First check available versions
versions_response = requests.get(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}/databases/{database_id}/available-target-versions",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
versions_response.raise_for_status()
print(f"Available versions: {versions_response.json()}")

# Then upgrade
payload = {"targetRedisVersion": "7.2"}

response = requests.post(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}/databases/{database_id}/upgrade",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Upgrade started. Task ID: {task_id}")
```

#### TypeScript

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

Reference: [Essentials Databases](https://redis.io/docs/latest/operate/rc/databases/)
