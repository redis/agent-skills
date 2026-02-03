---
title: Manage Redis ACL Rules
impact: MEDIUM
impactDescription: Define fine-grained command and key permissions
tags: rbac, acl, rules, permissions, commands, keys, security
---

## Manage Redis ACL Rules

Redis ACL rules define the specific Redis commands and key patterns that users can access. Rules use Redis ACL syntax and are referenced by roles.

### List Redis ACL Rules

**Endpoint:** `GET /acl/redisRules`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/acl/redisRules" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/acl/redisRules",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

rules = response.json().get("redisRules", [])
for rule in rules:
    print(f"ID: {rule['id']}, Name: {rule['name']}")
    print(f"  ACL: {rule.get('acl', 'N/A')}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/acl/redisRules", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { redisRules } = await response.json();
redisRules.forEach((rule: any) => {
  console.log(`ID: ${rule.id}, Name: ${rule.name}, ACL: ${rule.acl}`);
});
```

### Get Single Redis ACL Rule

**Endpoint:** `GET /acl/redisRules/{aclRedisRuleId}`

```bash
curl -X GET "https://api.redislabs.com/v1/acl/redisRules/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create Redis ACL Rule

**Endpoint:** `POST /acl/redisRules`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/acl/redisRules" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "read-only-cache",
    "acl": "+@read ~cache:*"
  }'
```

#### Python

```python
# Read-only rule for cache keys
payload = {
    "name": "read-only-cache",
    "acl": "+@read ~cache:*"
}

response = requests.post(
    "https://api.redislabs.com/v1/acl/redisRules",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Redis ACL rule creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
// Read-only rule for cache keys
const payload = {
  name: "read-only-cache",
  acl: "+@read ~cache:*"
};

const response = await fetch("https://api.redislabs.com/v1/acl/redisRules", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`Redis ACL rule creation started. Task ID: ${taskId}`);
```

### Update Redis ACL Rule

**Endpoint:** `PUT /acl/redisRules/{aclRedisRuleId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/acl/redisRules/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "acl": "+@read +@write ~cache:*"
  }'
```

### Delete Redis ACL Rule

**Endpoint:** `DELETE /acl/redisRules/{aclRedisRuleId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/acl/redisRules/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**ACL Syntax Reference:**

| Syntax | Description | Example |
|--------|-------------|---------|
| `+@category` | Allow command category | `+@read` |
| `-@category` | Deny command category | `-@dangerous` |
| `+command` | Allow specific command | `+get` |
| `-command` | Deny specific command | `-flushdb` |
| `~pattern` | Allow key pattern | `~cache:*` |
| `&pattern` | Allow Pub/Sub channel | `&notifications:*` |

**Common Command Categories:**

| Category | Commands |
|----------|----------|
| `@read` | GET, MGET, HGET, LRANGE, etc. |
| `@write` | SET, MSET, HSET, LPUSH, etc. |
| `@admin` | CONFIG, DEBUG, SHUTDOWN, etc. |
| `@dangerous` | FLUSHALL, FLUSHDB, KEYS, etc. |
| `@fast` | O(1) commands |
| `@slow` | O(N) or higher commands |

**Example ACL Rules:**

```bash
# Read-only access to all keys
"+@read ~*"

# Read/write access to cache: prefix only
"+@read +@write ~cache:*"

# Full access except dangerous commands
"+@all -@dangerous ~*"

# Read-only with specific commands
"+get +mget +hget +hgetall ~*"

# Pub/Sub only
"+@pubsub &notifications:*"
```

**Best Practices:**

- Use the principle of least privilege
- Start with restrictive rules and add permissions as needed
- Use key patterns to limit access scope
- Avoid `~*` (all keys) in production unless necessary
- Test rules in development before applying to production
- Document what each rule is intended to allow

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Invalid ACL syntax |
| 409 | Conflict | Rule name already exists |

Reference: [Redis ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)
