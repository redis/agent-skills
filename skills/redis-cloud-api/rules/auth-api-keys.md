---
title: Configure API Key Authentication
impact: HIGH
impactDescription: Required for all API operations
tags: auth, api-key, security, headers, authentication
---

## Configure API Key Authentication

All Redis Cloud API requests require authentication using an API key pair. You must include both the Account Key and Secret Key in request headers. API keys are created in the Redis Cloud console under Access Management > API Keys.

**Required Headers:**

| Header | Description |
|--------|-------------|
| `x-api-key` | Your Account Key (visible in console) |
| `x-api-secret-key` | Your Secret Key (shown only at creation time) |

### curl

```bash
# Set environment variables (recommended)
export REDIS_API_KEY="your-account-key"
export REDIS_API_SECRET="your-secret-key"

# Make authenticated request
curl -X GET "https://api.redislabs.com/v1/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Python

```python
import os
import requests

# Load credentials from environment
headers = {
    "x-api-key": os.environ["REDIS_API_KEY"],
    "x-api-secret-key": os.environ["REDIS_API_SECRET"]
}

# Make authenticated request
response = requests.get(
    "https://api.redislabs.com/v1/subscriptions",
    headers=headers
)

if response.status_code == 200:
    subscriptions = response.json()
    print(f"Found {len(subscriptions.get('subscriptions', []))} subscriptions")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

### TypeScript

```typescript
// Load credentials from environment
const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!
};

// Make authenticated request
const response = await fetch("https://api.redislabs.com/v1/subscriptions", {
  method: "GET",
  headers
});

if (response.ok) {
  const data = await response.json();
  console.log(`Found ${data.subscriptions?.length ?? 0} subscriptions`);
} else {
  console.error(`Error: ${response.status} - ${await response.text()}`);
}
```

**Best Practices:**

- Never hardcode API keys in source code; use environment variables or a secrets manager
- Store the secret key securely immediately after creation; it cannot be retrieved later
- Create separate API keys for different applications or environments
- Use the minimum required permissions when creating API keys
- Rotate API keys periodically and after any suspected compromise
- Consider IP allowlisting to restrict which IPs can use your API keys

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Verify API key and secret are correct |
| 403 | Forbidden | Check API key permissions or IP restrictions |

**Incorrect: Hardcoding credentials**

```python
# BAD: Never hardcode credentials
headers = {
    "x-api-key": "abc123",  # Don't do this!
    "x-api-secret-key": "secret456"
}
```

Reference: [Enable the Redis Cloud API](https://redis.io/docs/latest/operate/rc/api/get-started/enable-the-api/)
