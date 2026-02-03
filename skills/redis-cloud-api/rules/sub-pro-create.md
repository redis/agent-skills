---
title: Create Pro Subscriptions
impact: HIGH
impactDescription: Foundation for hosting Pro databases
tags: subscription, pro, create, provision, aws, gcp, azure
---

## Create Pro Subscriptions

Create a new Redis Cloud Pro subscription with flexible configuration options. Pro subscriptions support advanced features like Active-Active geo-replication, custom cloud accounts, and fine-grained resource control. This is an async operation that returns a `taskId`.

**Endpoint:** `POST /subscriptions`

**Key Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Subscription name |
| `dryRun` | boolean | No | Validate without creating (default: false) |
| `paymentMethodId` | integer | No | Payment method ID (uses default if omitted) |
| `cloudProviders` | array | Yes | Cloud provider and region configuration |
| `databases` | array | Yes | Initial databases to create |

### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-subscription",
    "cloudProviders": [{
      "provider": "AWS",
      "regions": [{
        "region": "us-east-1",
        "multipleAvailabilityZones": true,
        "networking": {
          "deploymentCIDR": "10.0.0.0/24"
        }
      }]
    }],
    "databases": [{
      "name": "cache-db",
      "protocol": "redis",
      "datasetSizeInGb": 5,
      "throughputMeasurement": {
        "by": "operations-per-second",
        "value": 10000
      },
      "replication": true,
      "modules": []
    }]
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

# Create a Pro subscription
payload = {
    "name": "production-subscription",
    "cloudProviders": [{
        "provider": "AWS",
        "regions": [{
            "region": "us-east-1",
            "multipleAvailabilityZones": True,
            "networking": {
                "deploymentCIDR": "10.0.0.0/24"
            }
        }]
    }],
    "databases": [{
        "name": "cache-db",
        "protocol": "redis",
        "datasetSizeInGb": 5,
        "throughputMeasurement": {
            "by": "operations-per-second",
            "value": 10000
        },
        "replication": True,
        "modules": []
    }]
}

response = requests.post(
    f"{BASE_URL}/subscriptions",
    headers=get_headers(),
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Subscription creation started. Task ID: {task_id}")

# Poll task to get subscription ID (see tasks-async-operations rule)
```

### TypeScript

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

Reference: [Create Pro Subscription](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Pro/operation/createSubscription)
