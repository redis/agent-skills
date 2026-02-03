---
title: Reference Data and Account Information
impact: LOW
impactDescription: Lookup data for subscription and database configuration
tags: reference, regions, modules, persistence, versions, payment, account
---

## Reference Data and Account Information

Reference endpoints provide lookup data for configuring subscriptions and databases, including available regions, Redis modules, persistence options, Redis versions, and payment methods.

### Get Account Information

**Endpoint:** `GET /`

Returns information about the current account associated with the API key.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

account = response.json()
print(f"Account ID: {account.get('id')}")
print(f"Account Name: {account.get('name')}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const account = await response.json();
console.log(`Account ID: ${account.id}`);
console.log(`Account Name: ${account.name}`);
```

### List Available Regions

**Endpoint:** `GET /regions`

Returns all cloud regions available for Redis Cloud deployments.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/regions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
response = requests.get(
    "https://api.redislabs.com/v1/regions",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

regions = response.json().get("regions", [])
for region in regions:
    print(f"Provider: {region['provider']}, Region: {region['name']}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/regions", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { regions } = await response.json();
regions.forEach((region: any) => {
  console.log(`Provider: ${region.provider}, Region: ${region.name}`);
});
```

### List Database Modules

**Endpoint:** `GET /database-modules`

Returns available Redis modules that can be enabled on databases.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/database-modules" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
response = requests.get(
    "https://api.redislabs.com/v1/database-modules",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

modules = response.json().get("modules", [])
for module in modules:
    print(f"Module: {module['name']}, Description: {module.get('description', 'N/A')}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/database-modules", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { modules } = await response.json();
modules.forEach((module: any) => {
  console.log(`Module: ${module.name}`);
});
```

**Available Modules:**

| Module | Description |
|--------|-------------|
| `RedisJSON` | Native JSON data type support |
| `RediSearch` | Full-text search and secondary indexing |
| `RedisTimeSeries` | Time series data structure |
| `RedisBloom` | Probabilistic data structures |
| `RedisGraph` | Graph database (deprecated) |

### List Data Persistence Options

**Endpoint:** `GET /data-persistence`

Returns available data persistence configurations.

```bash
curl -X GET "https://api.redislabs.com/v1/data-persistence" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Persistence Options:**

| Value | Description |
|-------|-------------|
| `none` | No persistence (cache only) |
| `aof-every-1-second` | AOF, fsync every second |
| `aof-every-write` | AOF, fsync on every write |
| `snapshot-every-1-hour` | RDB snapshot every hour |
| `snapshot-every-6-hours` | RDB snapshot every 6 hours |
| `snapshot-every-12-hours` | RDB snapshot every 12 hours |

### List Pro Redis Versions

**Endpoint:** `GET /subscriptions/redis-versions`

Returns available Redis versions for Pro subscriptions.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/redis-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### List Essentials Redis Versions

**Endpoint:** `GET /fixed/redis-versions`

Returns available Redis versions for Essentials subscriptions.

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/redis-versions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### List Payment Methods

**Endpoint:** `GET /payment-methods`

Returns configured payment methods for the account.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/payment-methods" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
response = requests.get(
    "https://api.redislabs.com/v1/payment-methods",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

methods = response.json().get("paymentMethods", [])
for method in methods:
    print(f"ID: {method['id']}, Type: {method['type']}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/payment-methods", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { paymentMethods } = await response.json();
paymentMethods.forEach((method: any) => {
  console.log(`ID: ${method.id}, Type: ${method.type}`);
});
```

### Get Query Performance Factors

**Endpoint:** `GET /query-performance-factors`

Returns factors that affect query performance for capacity planning.

```bash
curl -X GET "https://api.redislabs.com/v1/query-performance-factors" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Essentials Plan Details

**Endpoint:** `GET /fixed/plans/{planId}`

Get details for a specific Essentials plan.

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/plans/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Plans for Subscription

**Endpoint:** `GET /fixed/plans/subscriptions/{subscriptionId}`

Get available plans for upgrading an existing Essentials subscription.

```bash
curl -X GET "https://api.redislabs.com/v1/fixed/plans/subscriptions/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Use Cases:**

| Endpoint | Use Case |
|----------|----------|
| `/regions` | List regions when creating subscriptions |
| `/database-modules` | Check module availability before enabling |
| `/data-persistence` | Select persistence option for databases |
| `/subscriptions/redis-versions` | Check versions before upgrading |
| `/payment-methods` | Get payment method ID for subscriptions |
| `/fixed/plans` | Select plan for Essentials subscriptions |

**Best Practices:**

- Cache reference data locally to reduce API calls
- Check region availability before creating subscriptions
- Verify module compatibility with your Redis version
- Use payment method IDs from this endpoint when creating subscriptions

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Check API credentials |
| 404 | Not Found | Resource doesn't exist |

Reference: [Redis Cloud API](https://redis.io/docs/latest/operate/rc/api/)
