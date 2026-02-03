---
title: Manage Account Users
impact: LOW
impactDescription: Control who can access the Redis Cloud console and API
tags: account, users, team, access, console, permissions
---

## Manage Account Users

Account users are team members who can access the Redis Cloud console and API. Unlike ACL users (who access databases), account users manage subscriptions, databases, and other cloud resources.

### List Account Users

**Endpoint:** `GET /users`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/users" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/users",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

users = response.json().get("users", [])
for user in users:
    print(f"ID: {user['id']}, Name: {user['name']}, Email: {user['email']}")
    print(f"  Role: {user.get('role', 'N/A')}, Status: {user.get('status', 'N/A')}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/users", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { users } = await response.json();
users.forEach((user: any) => {
  console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
});
```

### Get Single User

**Endpoint:** `GET /users/{userId}`

```bash
curl -X GET "https://api.redislabs.com/v1/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Current Account

**Endpoint:** `GET /`

Returns information about the current account (the one associated with the API key).

```bash
curl -X GET "https://api.redislabs.com/v1/" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create User (Invite)

**Endpoint:** `POST /users`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/users" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Developer",
    "email": "jane@example.com",
    "role": "member"
  }'
```

#### Python

```python
payload = {
    "name": "Jane Developer",
    "email": "jane@example.com",
    "role": "member"
}

response = requests.post(
    "https://api.redislabs.com/v1/users",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"User invitation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const payload = {
  name: "Jane Developer",
  email: "jane@example.com",
  role: "member"
};

const response = await fetch("https://api.redislabs.com/v1/users", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`User invitation started. Task ID: ${taskId}`);
```

### Update User

**Endpoint:** `PUT /users/{userId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Senior Developer",
    "role": "owner"
  }'
```

### Delete User

**Endpoint:** `DELETE /users/{userId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/users/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Account User Roles:**

| Role | Description |
|------|-------------|
| `owner` | Full access, can manage billing and users |
| `member` | Can manage subscriptions and databases |
| `viewer` | Read-only access to all resources |

**Account User vs ACL User:**

| Feature | Account User | ACL User |
|---------|--------------|----------|
| Access to | Console & API | Database only |
| Authentication | Email/password, SSO | Redis AUTH |
| Purpose | Manage infrastructure | Run Redis commands |
| Scope | Account-wide | Database-specific |

**User Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Invitation sent, not yet accepted |
| `active` | User has accepted and can access |
| `suspended` | Access temporarily disabled |

**Best Practices:**

- Use the principle of least privilege when assigning roles
- Remove users promptly when they leave the organization
- Use `viewer` role for stakeholders who only need to monitor
- Owner role should be limited to account administrators
- Consider using SSO for enterprise deployments

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check email format and role |
| 409 | Conflict | User with this email already exists |

Reference: [Team Management](https://redis.io/docs/latest/operate/rc/security/access-control/access-management/)
