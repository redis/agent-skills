---
title: Clear, Action-Oriented Title (e.g., "Create Pro Subscription")
impact: HIGH
impactDescription: Brief description of impact (e.g., "Required for provisioning databases")
tags: relevant, keywords, here
---

## [Rule Title]

[1-2 sentence explanation of the operation and when to use it.]

**Endpoint:** `METHOD /path/{parameter}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| parameter | integer | Yes | Description of the parameter |

### curl

```bash
curl -X METHOD "https://api.redislabs.com/v1/path" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "field": "value"
  }'
```

### Python

```python
import os
import requests

headers = {
    "x-api-key": os.environ["REDIS_API_KEY"],
    "x-api-secret-key": os.environ["REDIS_API_SECRET"],
    "Content-Type": "application/json"
}

payload = {
    "field": "value"
}

response = requests.method(
    "https://api.redislabs.com/v1/path",
    headers=headers,
    json=payload
)

data = response.json()
```

### TypeScript

```typescript
const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!,
  "Content-Type": "application/json"
};

const payload = {
  field: "value"
};

const response = await fetch("https://api.redislabs.com/v1/path", {
  method: "METHOD",
  headers,
  body: JSON.stringify(payload)
});

const data = await response.json();
```

**Response:** Returns a `TaskStateUpdate` with `taskId` for async operations, or the resource directly for sync operations.

**Best Practices:**

- Tip 1 about using this operation effectively
- Tip 2 about common pitfalls to avoid

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check request body format |
| 404 | Not Found | Verify resource ID exists |

Reference: [Redis Cloud API Docs](https://redis.io/docs/latest/operate/rc/api/)
