---
title: Manage Active-Active Databases (CRDB)
impact: HIGH
impactDescription: Required for geo-replicated database operations
tags: active-active, crdb, geo-replication, multi-region, flush
---

## Manage Active-Active Databases (CRDB)

Active-Active databases (also known as CRDBs - Conflict-free Replicated Databases) provide geo-distributed data replication with automatic conflict resolution. These operations manage database properties across regions.

**Endpoint: `PUT /subscriptions/{subscriptionId}/databases/{databaseId}/regions`**

Update Active-Active database properties for specific regions:

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

const subscriptionId = 12345;
const databaseId = 67890;

// Update regional properties
const payload = {
  regions: [
    {
      regionId: 111,
      localThroughputMeasurement: {
        by: "operations-per-second",
        value: 15000
      }
    },
    {
      regionId: 222,
      localThroughputMeasurement: {
        by: "operations-per-second",
        value: 10000
      }
    }
  ]
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/regions`,
  {
    method: "PUT",
    headers,
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Active-Active database update started. Task ID: ${taskId}`);
```

```python
import os
import requests

BASE_URL = "https://api.redislabs.com/v1"
headers = {
    "x-api-key": os.environ["REDIS_API_KEY"],
    "x-api-secret-key": os.environ["REDIS_API_SECRET"],
    "Content-Type": "application/json"
}

subscription_id = 12345
database_id = 67890

payload = {
    "regions": [
        {
            "regionId": 111,
            "localThroughputMeasurement": {
                "by": "operations-per-second",
                "value": 15000
            }
        },
        {
            "regionId": 222,
            "localThroughputMeasurement": {
                "by": "operations-per-second",
                "value": 10000
            }
        }
    ]
}

response = requests.put(
    f"{BASE_URL}/subscriptions/{subscription_id}/databases/{database_id}/regions",
    headers=headers,
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Active-Active database update started. Task ID: {task_id}")
```

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

**Regional Properties:**

| Field | Description |
|-------|-------------|
| `regionId` | Region identifier (from GET regions) |
| `localThroughputMeasurement` | Throughput config for this region |
| `localDatasetSizeInGb` | Local memory allocation |

**Endpoint: `POST /subscriptions/{subscriptionId}/databases/{databaseId}/flush`**

Flush (delete all data from) an Active-Active database. For CRDB, you can flush specific regions:

```typescript
const subscriptionId = 12345;
const databaseId = 67890;

// Flush all regions
const payload = {};

// Or flush specific regions only
const payloadRegions = {
  regionIds: [111, 222]
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/databases/${databaseId}/flush`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Database flush started. Task ID: ${taskId}`);
```

```python
# Flush all regions
payload = {}

# Or flush specific regions
# payload = {"regionIds": [111, 222]}

response = requests.post(
    f"{BASE_URL}/subscriptions/{subscription_id}/databases/{database_id}/flush",
    headers=headers,
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Database flush started. Task ID: {task_id}")
```

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

**Incorrect: Flushing without confirmation**

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
