---
title: Manage Database Access Roles
impact: MEDIUM
impactDescription: Define permission sets for ACL users
tags: rbac, acl, roles, permissions, access-control, security
---

## Manage Database Access Roles

Database access roles define what Redis commands and key patterns ACL users can access. Roles are assigned to ACL users and can be associated with specific databases.

### List Roles

**Endpoint:** `GET /acl/roles`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/acl/roles" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/acl/roles",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

roles = response.json().get("roles", [])
for role in roles:
    print(f"ID: {role['id']}, Name: {role['name']}")
    if "redisRules" in role:
        print(f"  Redis Rules: {[r['name'] for r in role['redisRules']]}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/acl/roles", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { roles } = await response.json();
roles.forEach((role: any) => {
  console.log(`ID: ${role.id}, Name: ${role.name}`);
});
```

### Get Single Role

**Endpoint:** `GET /acl/roles/{aclRoleId}`

```bash
curl -X GET "https://api.redislabs.com/v1/acl/roles/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create Role

**Endpoint:** `POST /acl/roles`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/acl/roles" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cache-reader",
    "redisRules": [
      {"ruleId": 11111}
    ],
    "databases": [
      {"subscriptionId": 12345, "databaseId": 67890}
    ]
  }'
```

#### Python

```python
payload = {
    "name": "cache-reader",
    "redisRules": [
        {"ruleId": 11111}  # Reference to Redis ACL rule
    ],
    "databases": [
        {"subscriptionId": 12345, "databaseId": 67890}
    ]
}

response = requests.post(
    "https://api.redislabs.com/v1/acl/roles",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Role creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const payload = {
  name: "cache-reader",
  redisRules: [
    { ruleId: 11111 }
  ],
  databases: [
    { subscriptionId: 12345, databaseId: 67890 }
  ]
};

const response = await fetch("https://api.redislabs.com/v1/acl/roles", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`Role creation started. Task ID: ${taskId}`);
```

### Update Role

**Endpoint:** `PUT /acl/roles/{aclRoleId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/acl/roles/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cache-reader-updated",
    "redisRules": [
      {"ruleId": 11111},
      {"ruleId": 22222}
    ],
    "databases": [
      {"subscriptionId": 12345, "databaseId": 67890},
      {"subscriptionId": 12345, "databaseId": 67891}
    ]
  }'
```

### Delete Role

**Endpoint:** `DELETE /acl/roles/{aclRoleId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/acl/roles/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Role Structure:**

```
Role
├── name: "cache-reader"
├── redisRules: [Redis ACL rules defining permissions]
└── databases: [List of databases this role applies to]
```

**Role-Rule-Database Relationship:**

1. **Redis ACL Rules** define what commands/keys are allowed
2. **Roles** combine rules and associate them with databases
3. **ACL Users** are assigned roles to get permissions

**Best Practices:**

- Create roles for common access patterns (read-only, write-only, admin)
- Associate roles with specific databases rather than all databases
- Use separate roles for different application tiers
- Review and audit role assignments periodically
- Create Redis ACL rules first, then reference them in roles

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check ruleId and database references |
| 404 | Not Found | Role or referenced resource doesn't exist |
| 409 | Conflict | Role name already exists |

Reference: [Database Access Roles](https://redis.io/docs/latest/operate/rc/security/access-control/data-access-control/role-based-access-control/)
