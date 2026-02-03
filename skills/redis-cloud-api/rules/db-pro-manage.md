---
title: Manage Pro Databases
impact: HIGH
impactDescription: Update, retrieve, and delete Pro databases
tags: database, pro, update, delete, get, list, manage, backup, import
---

## Manage Pro Databases

Retrieve, update, and delete databases within Pro subscriptions. Includes operations for listing, scaling, backup, and import.

### List Databases in Subscription

**Endpoint:** `GET /subscriptions/{subscriptionId}/databases`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/databases",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

databases = response.json().get("subscription", [{}])[0].get("databases", [])
for db in databases:
    print(f"ID: {db['databaseId']}, Name: {db['name']}, Status: {db['status']}")
```

#### TypeScript

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

### Get Single Database

**Endpoint:** `GET /subscriptions/{subscriptionId}/databases/{databaseId}`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/databases/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345
database_id = 67890

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/databases/{database_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

db = response.json()
print(f"Name: {db['name']}")
print(f"Status: {db['status']}")
print(f"Endpoint: {db.get('publicEndpoint', 'N/A')}")
print(f"Password: {db.get('security', {}).get('password', 'N/A')}")
```

#### TypeScript

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

### Update Database

**Endpoint:** `PUT /subscriptions/{subscriptionId}/databases/{databaseId}`

Scale memory, throughput, or modify settings. This is an async operation.

#### curl

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/databases/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetSizeInGb": 10,
    "throughputMeasurement": {
      "by": "operations-per-second",
      "value": 25000
    },
    "dataPersistence": "aof-every-1-second",
    "alerts": [
      {"name": "dataset-size", "value": 80}
    ]
  }'
```

#### Python

```python
subscription_id = 12345
database_id = 67890

response = requests.put(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/databases/{database_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json={
        "datasetSizeInGb": 10,  # Scale up memory
        "throughputMeasurement": {
            "by": "operations-per-second",
            "value": 25000  # Scale up throughput
        }
    }
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Update started. Task ID: {task_id}")
```

#### TypeScript

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

### Delete Database

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/databases/{databaseId}`

#### curl

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/databases/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345
database_id = 67890

response = requests.delete(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/databases/{database_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Deletion started. Task ID: {task_id}")
```

#### TypeScript

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

### Backup Database

**Endpoint:** `POST /subscriptions/{subscriptionId}/databases/{databaseId}/backup`

Trigger an immediate backup.

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases/67890/backup" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Import Data

**Endpoint:** `POST /subscriptions/{subscriptionId}/databases/{databaseId}/import`

Import data from RDB file or another Redis instance.

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

Reference: [Pro Databases API](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Pro)
