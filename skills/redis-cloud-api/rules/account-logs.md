---
title: Audit and Session Logs
impact: LOW
impactDescription: Monitor account activity and API usage
tags: logs, audit, session, monitoring, security, compliance
---

## Audit and Session Logs

Access audit logs and session logs to monitor account activity, track API usage, and support compliance requirements.

### Get Audit Logs

**Endpoint:** `GET /logs`

Returns audit logs for account activities including subscription changes, database operations, and user management.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/logs" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/logs",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

logs = response.json().get("logs", [])
for log in logs:
    print(f"Time: {log.get('timestamp')}")
    print(f"Action: {log.get('action')}")
    print(f"User: {log.get('user', {}).get('email', 'N/A')}")
    print(f"Resource: {log.get('resource', 'N/A')}")
    print("---")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/logs", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { logs } = await response.json();
logs.forEach((log: any) => {
  console.log(`Time: ${log.timestamp}`);
  console.log(`Action: ${log.action}`);
  console.log(`User: ${log.user?.email ?? "N/A"}`);
  console.log(`Resource: ${log.resource ?? "N/A"}`);
  console.log("---");
});
```

### Get Session Logs

**Endpoint:** `GET /session-logs`

Returns session logs for API and console access sessions.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/session-logs" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
response = requests.get(
    "https://api.redislabs.com/v1/session-logs",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

sessions = response.json().get("sessions", [])
for session in sessions:
    print(f"Session ID: {session.get('sessionId')}")
    print(f"User: {session.get('user', {}).get('email', 'N/A')}")
    print(f"IP Address: {session.get('ipAddress', 'N/A')}")
    print(f"Start Time: {session.get('startTime')}")
    print(f"End Time: {session.get('endTime', 'Active')}")
    print("---")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/session-logs", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { sessions } = await response.json();
sessions.forEach((session: any) => {
  console.log(`Session ID: ${session.sessionId}`);
  console.log(`User: ${session.user?.email ?? "N/A"}`);
  console.log(`IP Address: ${session.ipAddress ?? "N/A"}`);
  console.log(`Start Time: ${session.startTime}`);
  console.log("---");
});
```

**Audit Log Entry Fields:**

| Field | Description |
|-------|-------------|
| `timestamp` | When the action occurred |
| `action` | Type of action performed |
| `user` | User who performed the action |
| `resource` | Resource that was affected |
| `resourceId` | ID of the affected resource |
| `details` | Additional action details |
| `status` | Success or failure status |

**Common Audit Actions:**

| Action | Description |
|--------|-------------|
| `subscription.create` | Subscription created |
| `subscription.update` | Subscription modified |
| `subscription.delete` | Subscription deleted |
| `database.create` | Database created |
| `database.update` | Database modified |
| `database.delete` | Database deleted |
| `user.invite` | User invited to account |
| `user.remove` | User removed from account |
| `apiKey.create` | API key created |
| `apiKey.delete` | API key deleted |

**Session Log Entry Fields:**

| Field | Description |
|-------|-------------|
| `sessionId` | Unique session identifier |
| `user` | User associated with session |
| `ipAddress` | Client IP address |
| `userAgent` | Client user agent string |
| `startTime` | Session start timestamp |
| `endTime` | Session end timestamp (null if active) |
| `type` | Session type (api, console) |

**Use Cases:**

| Use Case | Log Type |
|----------|----------|
| Security auditing | Audit logs |
| Compliance reporting | Audit logs |
| Track configuration changes | Audit logs |
| Monitor API usage | Session logs |
| Detect unauthorized access | Both |
| Debug API issues | Session logs |

**Best Practices:**

- Regularly review audit logs for unexpected changes
- Monitor session logs for unusual IP addresses
- Export logs periodically for long-term retention
- Set up alerts for critical actions (deletions, permission changes)
- Use logs to track changes during incident investigation

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | API key lacks log access permission |

Reference: [Redis Cloud Security](https://redis.io/docs/latest/operate/rc/security/)
