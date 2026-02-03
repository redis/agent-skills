---
title: Create Essentials Databases
impact: MEDIUM
impactDescription: Provision databases in Essentials subscriptions
tags: database, essentials, fixed, create, provision
---

## Create Essentials Databases

Create a new database within an Essentials subscription. Essentials databases have simpler configuration options compared to Pro. This is an async operation.

**Endpoint:** `POST /fixed/subscriptions/{subscriptionId}/databases`

**Key Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Database name |
| `protocol` | string | No | `redis` (default) or `memcached` |
| `dataPersistence` | string | No | Persistence strategy |
| `dataEvictionPolicy` | string | No | Eviction policy when memory is full |
| `replication` | boolean | No | Enable replication |
| `enableDefaultUser` | boolean | No | Enable default user authentication |

### curl

```bash
curl -X POST "https://api.redislabs.com/v1/fixed/subscriptions/12345/databases" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-essentials-db",
    "dataPersistence": "aof-every-1-second",
    "dataEvictionPolicy": "allkeys-lru",
    "replication": true,
    "enableDefaultUser": true,
    "alerts": [
      {"name": "datasets-size", "value": 80}
    ]
  }'
```

### Python

```python
import os
import requests

BASE_URL = "https://api.redislabs.com/v1"

def get_headers():
    return {
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    }

subscription_id = 12345

payload = {
    "name": "my-essentials-db",
    "dataPersistence": "aof-every-1-second",
    "dataEvictionPolicy": "allkeys-lru",
    "replication": True,
    "enableDefaultUser": True,
    "alerts": [
        {"name": "datasets-size", "value": 80}
    ]
}

response = requests.post(
    f"{BASE_URL}/fixed/subscriptions/{subscription_id}/databases",
    headers=get_headers(),
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Database creation started. Task ID: {task_id}")
```

### TypeScript

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

Reference: [Essentials Databases API](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Essentials)
