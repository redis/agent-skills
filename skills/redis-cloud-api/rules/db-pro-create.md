---
title: Create Pro Databases
impact: HIGH
impactDescription: Provision databases with advanced features
tags: database, pro, create, provision, modules, persistence, replication
---

## Create Pro Databases

Create a new database within an existing Pro subscription. Pro databases support advanced features like Redis modules, flexible persistence options, and fine-grained throughput control. This is an async operation.

**Endpoint:** `POST /subscriptions/{subscriptionId}/databases`

**Key Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Database name (unique within subscription) |
| `protocol` | string | No | `redis` (default) or `memcached` |
| `datasetSizeInGb` | number | Yes | Memory limit for dataset |
| `throughputMeasurement` | object | No | Throughput configuration |
| `replication` | boolean | No | Enable high availability |
| `dataPersistence` | string | No | Persistence strategy |
| `modules` | array | No | Redis modules to enable |

### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/databases" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-database",
    "datasetSizeInGb": 5,
    "throughputMeasurement": {
      "by": "operations-per-second",
      "value": 10000
    },
    "replication": true,
    "dataPersistence": "aof-every-1-second",
    "modules": [
      {"name": "RedisJSON"},
      {"name": "RediSearch"}
    ],
    "alerts": [
      {"name": "dataset-size", "value": 80}
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
    "name": "my-database",
    "datasetSizeInGb": 5,
    "throughputMeasurement": {
        "by": "operations-per-second",
        "value": 10000
    },
    "replication": True,
    "dataPersistence": "aof-every-1-second",
    "modules": [
        {"name": "RedisJSON"},
        {"name": "RediSearch"}
    ],
    "alerts": [
        {"name": "dataset-size", "value": 80}
    ]
}

response = requests.post(
    f"{BASE_URL}/subscriptions/{subscription_id}/databases",
    headers=get_headers(),
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Database creation started. Task ID: {task_id}")

# Poll task to get database ID (see tasks-async-operations rule)
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

Reference: [Create Pro Database](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Databases-Pro/operation/createDatabase)
