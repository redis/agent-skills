---
title: Manage ACL Users
impact: MEDIUM
impactDescription: Control database access with fine-grained user permissions
tags: rbac, acl, users, access-control, security, authentication
---

## Manage ACL Users

ACL (Access Control List) users are database-level users that can connect to Redis databases with specific permissions. Unlike account users who manage the Redis Cloud console, ACL users authenticate directly to Redis databases.

### List ACL Users

**Endpoint:** `GET /acl/users`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/acl/users" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/acl/users",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

users = response.json().get("users", [])
for user in users:
    print(f"ID: {user['id']}, Name: {user['name']}, Role: {user.get('role', 'N/A')}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/acl/users", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { users } = await response.json();
users.forEach((user: any) => {
  console.log(`ID: ${user.id}, Name: ${user.name}, Role: ${user.role ?? "N/A"}`);
});
```

### Get Single ACL User

**Endpoint:** `GET /acl/users/{aclUserId}`

```bash
curl -X GET "https://api.redislabs.com/v1/acl/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create ACL User

**Endpoint:** `POST /acl/users`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/acl/users" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "app-user",
    "password": "SecurePassword123!",
    "role": "db-member"
  }'
```

#### Python

```python
payload = {
    "name": "app-user",
    "password": "SecurePassword123!",
    "role": "db-member"  # Role ID or name
}

response = requests.post(
    "https://api.redislabs.com/v1/acl/users",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"ACL user creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const payload = {
  name: "app-user",
  password: "SecurePassword123!",
  role: "db-member"
};

const response = await fetch("https://api.redislabs.com/v1/acl/users", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`ACL user creation started. Task ID: ${taskId}`);
```

### Update ACL User

**Endpoint:** `PUT /acl/users/{aclUserId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/acl/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewSecurePassword456!",
    "role": "db-admin"
  }'
```

### Delete ACL User

**Endpoint:** `DELETE /acl/users/{aclUserId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/acl/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**ACL User vs Account User:**

| Feature | ACL User | Account User |
|---------|----------|--------------|
| Purpose | Database access | Console access |
| Scope | Specific databases | Account-wide |
| Authentication | Redis AUTH | Console login |
| Permissions | Redis commands | API/Console actions |

**Connecting with ACL User:**

```python
import redis

# Connect using ACL user credentials
r = redis.Redis(
    host="redis-12345.c1.us-east-1.ec2.cloud.redislabs.com",
    port=12345,
    username="app-user",  # ACL username
    password="SecurePassword123!",
    ssl=True
)

r.set("key", "value")
```

```typescript
import { createClient } from "redis";

const client = createClient({
  url: "rediss://app-user:SecurePassword123!@redis-12345.c1.us-east-1.ec2.cloud.redislabs.com:12345"
});

await client.connect();
await client.set("key", "value");
```

**Best Practices:**

- Create separate ACL users for each application or service
- Use strong passwords and rotate them periodically
- Assign roles with minimum required permissions
- Don't share ACL users across environments (dev, staging, prod)
- Use ACL users instead of the default user for production

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check password requirements |
| 409 | Conflict | User name already exists |

Reference: [Role-based Access Control](https://redis.io/docs/latest/operate/rc/security/access-control/data-access-control/role-based-access-control/)
