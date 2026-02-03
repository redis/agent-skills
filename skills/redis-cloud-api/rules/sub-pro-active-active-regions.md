---
title: Manage Active-Active Subscription Regions
impact: HIGH
impactDescription: Required for geo-distributed deployments
tags: active-active, regions, multi-region, geo-replication
---

## Manage Active-Active Subscription Regions

Active-Active subscriptions enable geo-distributed Redis deployments with automatic conflict resolution. Manage regions to add, remove, or query regions in an Active-Active subscription.

**Endpoint: `GET /subscriptions/{subscriptionId}/regions`**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!
};

const subscriptionId = 12345;

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/regions`,
  { headers }
);

const data = await response.json();
data.regions?.forEach((region: any) => {
  console.log(`Region: ${region.region}, ID: ${region.regionId}`);
  console.log(`  Status: ${region.status}`);
  console.log(`  CIDR: ${region.networking?.deploymentCIDR ?? "N/A"}`);
});
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

response = requests.get(
    f"{BASE_URL}/subscriptions/{subscription_id}/regions",
    headers=headers
)
response.raise_for_status()

data = response.json()
for region in data.get("regions", []):
    print(f"Region: {region['region']}, ID: {region['regionId']}")
    print(f"  Status: {region['status']}")
```

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `POST /subscriptions/{subscriptionId}/regions`**

Add a new region to an existing Active-Active subscription:

```typescript
const subscriptionId = 12345;

const payload = {
  region: "eu-west-1",
  deploymentCIDR: "10.1.0.0/24",
  respRe: {
    dryRun: false
  }
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/regions`,
  {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Add region started. Task ID: ${taskId}`);
```

```python
payload = {
    "region": "eu-west-1",
    "deploymentCIDR": "10.1.0.0/24"
}

response = requests.post(
    f"{BASE_URL}/subscriptions/{subscription_id}/regions",
    headers={**headers, "Content-Type": "application/json"},
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Add region started. Task ID: {task_id}")
```

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

**Endpoint: `DELETE /subscriptions/{subscriptionId}/regions`**

Remove one or more regions from an Active-Active subscription:

```typescript
const subscriptionId = 12345;

const payload = {
  regionIds: [67890, 67891]  // Region IDs to delete
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/regions`,
  {
    method: "DELETE",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Delete regions started. Task ID: ${taskId}`);
```

```python
payload = {
    "regionIds": [67890, 67891]
}

response = requests.delete(
    f"{BASE_URL}/subscriptions/{subscription_id}/regions",
    headers={**headers, "Content-Type": "application/json"},
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Delete regions started. Task ID: {task_id}")
```

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "regionIds": [67890, 67891]
  }'
```

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
