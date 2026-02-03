---
title: Create Essentials Subscriptions
impact: MEDIUM
impactDescription: Simplified subscription for smaller workloads
tags: subscription, essentials, fixed, create, provision
---

## Create Essentials Subscriptions

Create a Redis Cloud Essentials subscription with predefined plans. Essentials subscriptions offer simpler configuration with fixed pricing tiers, ideal for development, testing, or smaller production workloads. This is an async operation.

**Endpoint:** `POST /fixed/subscriptions`

**Key Differences from Pro:**

| Feature | Essentials | Pro |
|---------|-----------|-----|
| Pricing | Fixed tiers | Pay-per-use |
| Configuration | Predefined plans | Fully customizable |
| Cloud accounts | Redis-managed only | BYOA supported |
| VPC Peering | Limited | Full support |

### curl

```bash
curl -X POST "https://api.redislabs.com/v1/fixed/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dev-subscription",
    "planId": 12345,
    "paymentMethodId": 67890
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

# First, get available plans
plans_response = requests.get(
    f"{BASE_URL}/fixed/plans",
    headers=get_headers()
)
plans_response.raise_for_status()
plans = plans_response.json().get("plans", [])

# Filter plans by provider and region
aws_plans = [p for p in plans if p["provider"] == "AWS" and p["region"] == "us-east-1"]
for plan in aws_plans[:5]:
    print(f"Plan {plan['id']}: {plan['name']} - {plan['size']}MB, ${plan['price']}/mo")

# Create subscription with selected plan
payload = {
    "name": "dev-subscription",
    "planId": aws_plans[0]["id"]  # Use first matching plan
}

response = requests.post(
    f"{BASE_URL}/fixed/subscriptions",
    headers=get_headers(),
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Subscription creation started. Task ID: {task_id}")
```

### TypeScript

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

### Get Available Plans

**Endpoint:** `GET /fixed/plans`

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

Reference: [Essentials Subscriptions API](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Essentials)
