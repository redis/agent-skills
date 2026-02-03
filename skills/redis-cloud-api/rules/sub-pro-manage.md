---
title: Manage Pro Subscriptions
impact: HIGH
impactDescription: Update, retrieve, and delete Pro subscriptions
tags: subscription, pro, update, delete, get, list, manage
---

## Manage Pro Subscriptions

Retrieve, update, and delete existing Pro subscriptions. Use these operations to view subscription details, modify settings, or clean up unused resources.

### List All Pro Subscriptions

**Endpoint:** `GET /subscriptions`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/subscriptions",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

subscriptions = response.json().get("subscriptions", [])
for sub in subscriptions:
    print(f"ID: {sub['id']}, Name: {sub['name']}, Status: {sub['status']}")
```

#### TypeScript

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

### Get Single Pro Subscription

**Endpoint:** `GET /subscriptions/{subscriptionId}`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

subscription = response.json()
print(f"Name: {subscription['name']}")
print(f"Status: {subscription['status']}")
print(f"Cloud: {subscription['cloudDetails'][0]['provider']}")
```

#### TypeScript

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

### Update Pro Subscription

**Endpoint:** `PUT /subscriptions/{subscriptionId}`

Updates are async and return a `taskId`. Only certain fields can be updated after creation.

#### curl

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "updated-subscription-name",
    "paymentMethodId": 67890
  }'
```

#### Python

```python
subscription_id = 12345

response = requests.put(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json={
        "name": "updated-subscription-name",
        "paymentMethodId": 67890
    }
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Update started. Task ID: {task_id}")
```

#### TypeScript

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

### Delete Pro Subscription

**Endpoint:** `DELETE /subscriptions/{subscriptionId}`

Deletes are async. **All databases must be deleted first** before deleting a subscription.

#### curl

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

response = requests.delete(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}",
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

### Get Subscription CIDR

**Endpoint:** `GET /subscriptions/{subscriptionId}/cidr`

Get the CIDR whitelist for a subscription.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/cidr" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/cidr",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

cidr_data = response.json()
print(f"Deployment CIDR: {cidr_data.get('deploymentCidr')}")
print(f"CIDR Whitelist: {cidr_data.get('cidrWhitelist', [])}")
```

#### TypeScript

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

### Update Subscription CIDR

**Endpoint:** `PUT /subscriptions/{subscriptionId}/cidr`

Update the CIDR whitelist for IP-based access control.

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/cidr" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "cidrIps": ["10.0.0.0/16", "192.168.1.0/24"]
  }'
```

### Get Subscription Pricing

**Endpoint:** `GET /subscriptions/{subscriptionId}/pricing`

Get current pricing information for a subscription.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/pricing" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/pricing",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

pricing = response.json()
print(f"Monthly cost: ${pricing.get('monthlyPrice', 0):.2f}")
print(f"Hourly cost: ${pricing.get('hourlyPrice', 0):.4f}")
```

#### TypeScript

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

Reference: [Pro Subscriptions API](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Pro)
