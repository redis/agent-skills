---
title: Handle API Errors and Retries
impact: HIGH
impactDescription: Build resilient applications that handle failures gracefully
tags: errors, error-handling, retry, http-status, resilience, debugging
---

## Handle API Errors and Retries

The Redis Cloud API returns standard HTTP status codes and JSON error responses. Implementing proper error handling ensures your applications can recover from failures and provide meaningful feedback.

**Error Response Format:**

```json
{
  "status": 400,
  "message": "Bad Request - The server cannot process the request due to something that is perceived to be a client error"
}
```

### HTTP Status Codes

| Code | Name | Retryable | Description |
|------|------|-----------|-------------|
| 400 | Bad Request | No | Invalid request format or parameters |
| 401 | Unauthorized | No | Invalid or missing API credentials |
| 403 | Forbidden | No | API key lacks permission or IP restricted |
| 404 | Not Found | No | Resource doesn't exist |
| 408 | Request Timeout | Yes | Server timeout, retry with backoff |
| 409 | Conflict | Maybe | Resource conflict (check message) |
| 412 | Precondition Failed | No | Feature flag disabled |
| 422 | Unprocessable Entity | No | Valid syntax but invalid semantics |
| 429 | Too Many Requests | Yes | Rate limited, retry with backoff |
| 500 | Internal Server Error | Yes | Server error, retry with backoff |
| 503 | Service Unavailable | Yes | Temporary outage, retry with backoff |

### Python Error Handling

```python
import os
import time
import requests
from typing import Optional, Any

class RedisCloudAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"HTTP {status_code}: {message}")

class RedisCloudClient:
    BASE_URL = "https://api.redislabs.com/v1"
    RETRYABLE_CODES = {408, 429, 500, 503}
    
    def __init__(self):
        self.headers = {
            "x-api-key": os.environ["REDIS_API_KEY"],
            "x-api-secret-key": os.environ["REDIS_API_SECRET"],
            "Content-Type": "application/json"
        }
    
    def request(
        self,
        method: str,
        path: str,
        max_retries: int = 5,
        base_delay: float = 1.0,
        **kwargs
    ) -> Any:
        """Make API request with automatic retry for transient errors."""
        url = f"{self.BASE_URL}{path}"
        
        for attempt in range(max_retries):
            try:
                response = requests.request(
                    method, url, headers=self.headers, **kwargs
                )
                
                # Success
                if response.ok:
                    return response.json() if response.content else None
                
                # Parse error
                try:
                    error_data = response.json()
                    message = error_data.get("message", response.text)
                except:
                    message = response.text
                
                # Retryable error
                if response.status_code in self.RETRYABLE_CODES:
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        print(f"Retryable error {response.status_code}. "
                              f"Retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
                        time.sleep(delay)
                        continue
                
                # Non-retryable error or max retries exceeded
                raise RedisCloudAPIError(response.status_code, message)
                
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"Network error: {e}. Retrying in {delay}s")
                    time.sleep(delay)
                    continue
                raise

        raise RedisCloudAPIError(0, "Max retries exceeded")

# Usage
client = RedisCloudClient()

try:
    subscriptions = client.request("GET", "/subscriptions")
    print(f"Found {len(subscriptions.get('subscriptions', []))} subscriptions")
except RedisCloudAPIError as e:
    if e.status_code == 401:
        print("Check your API credentials")
    elif e.status_code == 403:
        print("API key lacks permission or IP is blocked")
    elif e.status_code == 404:
        print("Resource not found")
    else:
        print(f"API error: {e}")
```

### TypeScript Error Handling

```typescript
class RedisCloudAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(`HTTP ${statusCode}: ${message}`);
    this.name = "RedisCloudAPIError";
  }
}

class RedisCloudClient {
  private readonly baseUrl = "https://api.redislabs.com/v1";
  private readonly retryableCodes = new Set([408, 429, 500, 503]);
  private readonly headers: Record<string, string>;
  
  constructor() {
    this.headers = {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    };
  }
  
  async request<T>(
    method: string,
    path: string,
    options: {
      body?: object;
      maxRetries?: number;
      baseDelay?: number;
    } = {}
  ): Promise<T> {
    const { body, maxRetries = 5, baseDelay = 1000 } = options;
    const url = `${this.baseUrl}${path}`;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: body ? JSON.stringify(body) : undefined
        });
        
        // Success
        if (response.ok) {
          const text = await response.text();
          return text ? JSON.parse(text) : null;
        }
        
        // Parse error
        let message: string;
        try {
          const errorData = await response.json();
          message = errorData.message ?? response.statusText;
        } catch {
          message = response.statusText;
        }
        
        // Retryable error
        if (this.retryableCodes.has(response.status)) {
          if (attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Retryable error ${response.status}. ` +
              `Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        
        throw new RedisCloudAPIError(response.status, message);
        
      } catch (e) {
        if (e instanceof RedisCloudAPIError) throw e;
        
        // Network error - retry
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Network error: ${e}. Retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw e;
      }
    }
    
    throw new RedisCloudAPIError(0, "Max retries exceeded");
  }
}

// Usage
const client = new RedisCloudClient();

try {
  const data = await client.request<{ subscriptions: any[] }>("GET", "/subscriptions");
  console.log(`Found ${data.subscriptions.length} subscriptions`);
} catch (e) {
  if (e instanceof RedisCloudAPIError) {
    switch (e.statusCode) {
      case 401:
        console.error("Check your API credentials");
        break;
      case 403:
        console.error("API key lacks permission or IP is blocked");
        break;
      case 404:
        console.error("Resource not found");
        break;
      default:
        console.error(`API error: ${e.message}`);
    }
  } else {
    throw e;
  }
}
```

### Common Error Scenarios

**401 Unauthorized:**
```
Check:
- API key is correctly set
- Secret key is correctly set
- Keys have not been rotated or deleted
```

**403 Forbidden:**
```
Check:
- API key has required permissions
- Your IP is in the allowlist (if IP restrictions enabled)
- Feature is available for your account tier
```

**409 Conflict:**
```
Check:
- Resource name already exists (subscriptions, databases)
- Resource is in use (can't delete subscription with databases)
- Concurrent operation in progress
```

**422 Unprocessable Entity:**
```
Check:
- Region is valid for your cloud provider
- Module combination is supported
- CIDR doesn't conflict with existing configuration
```

**Best Practices:**

- Always implement retry logic for 408, 429, 500, 503 errors
- Use exponential backoff with jitter to prevent thundering herd
- Log error details for debugging (but sanitize credentials)
- Handle 409 conflicts by checking current state before retrying
- Set reasonable timeouts to avoid hanging requests
- Monitor error rates to detect systemic issues

**Debugging Tips:**

```bash
# Include response headers for debugging
curl -v -X GET "https://api.redislabs.com/v1/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"

# Check task status for failed async operations
curl -X GET "https://api.redislabs.com/v1/tasks/$TASK_ID" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

Reference: [API Error Handling](https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/)
