---
title: Manage Essentials Subscriptions
impact: MEDIUM
impactDescription: Retrieve, update, and delete Essentials subscriptions
tags: subscription, essentials, fixed, update, delete, get, list, manage
---

## Manage Essentials Subscriptions

Retrieve, update, and delete existing Essentials subscriptions. Essentials subscriptions use the `/fixed/subscriptions` endpoint prefix.

### List All Essentials Subscriptions

**Endpoint:** `GET /fixed/subscriptions`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/fixed/subscriptions",
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
const response = await fetch("https://api.redislabs.com/v1/fixed/subscriptions", {
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

### Get Single Essentials Subscription

**Endpoint:** `GET /fixed/subscriptions/{subscriptionId}`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

subscription = response.json()
print(f"Name: {subscription['name']}")
print(f"Status: {subscription['status']}")
print(f"Plan: {subscription.get('planId')}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}`,
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

### Update Essentials Subscription

**Endpoint:** `PUT /fixed/subscriptions/{subscriptionId}`

Essentials subscriptions have limited update options compared to Pro.

#### curl

```bash
curl -X PUT "https://api.redislabs.com/v1/fixed/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "renamed-subscription"
  }'
```

#### Python

```python
subscription_id = 12345

response = requests.put(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json={
        "name": "renamed-subscription"
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
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}`,
  {
    method: "PUT",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "renamed-subscription"
    })
  }
);

const { taskId } = await response.json();
console.log(`Update started. Task ID: ${taskId}`);
```

### Delete Essentials Subscription

**Endpoint:** `DELETE /fixed/subscriptions/{subscriptionId}`

#### curl

```bash
curl -X DELETE "https://api.redislabs.com/v1/fixed/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

# First, delete all databases in the subscription
# (see db-ess-manage rule)

response = requests.delete(
    f"https://api.redislabs.com/v1/fixed/subscriptions/{subscription_id}",
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

// First, delete all databases in the subscription
// (see db-ess-manage rule)

const response = await fetch(
  `https://api.redislabs.com/v1/fixed/subscriptions/${subscriptionId}`,
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

**Best Practices:**

- All databases must be deleted before deleting a subscription
- Poll task status after update/delete operations
- Essentials subscriptions cannot be upgraded to Pro; create a new Pro subscription and migrate data

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Not Found | Subscription ID doesn't exist |
| 409 | Conflict | Cannot delete subscription with existing databases |

Reference: [Essentials Subscriptions API](https://redis.io/docs/latest/operate/rc/api/api-reference/#tag/Subscriptions-Essentials)
