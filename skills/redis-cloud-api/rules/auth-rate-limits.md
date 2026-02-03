---
title: Handle Rate Limits and Throttling
impact: HIGH
impactDescription: Prevents request failures during high-volume operations
tags: auth, rate-limit, throttling, 429, retry, backoff
---

## Handle Rate Limits and Throttling

The Redis Cloud API enforces rate limits to ensure fair usage. When you exceed the limit, you'll receive a 429 (Too Many Requests) response. Implement exponential backoff to handle rate limiting gracefully.

**Rate Limit Response:**

```json
{
  "status": 429,
  "message": "Too Many Requests - Too many resources are concurrently created / updated / deleted in the account. Please re-submit API requests after resource changes are completed)"
}
```

### curl

```bash
# Simple retry with sleep
max_retries=5
retry_count=0
wait_time=1

while [ $retry_count -lt $max_retries ]; do
  response=$(curl -s -w "\n%{http_code}" -X GET \
    "https://api.redislabs.com/v1/subscriptions" \
    -H "x-api-key: $REDIS_API_KEY" \
    -H "x-api-secret-key: $REDIS_API_SECRET")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 429 ]; then
    echo "Rate limited, waiting ${wait_time}s before retry..."
    sleep $wait_time
    wait_time=$((wait_time * 2))
    retry_count=$((retry_count + 1))
  else
    echo "$body"
    break
  fi
done
```

### Python

```python
import os
import time
import requests
from typing import Optional, Any

def make_request_with_retry(
    method: str,
    url: str,
    max_retries: int = 5,
    base_delay: float = 1.0,
    **kwargs
) -> Optional[Any]:
    """Make an API request with exponential backoff for rate limits."""
    headers = {
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        **kwargs.get("headers", {})
    }
    kwargs["headers"] = headers
    
    for attempt in range(max_retries):
        response = requests.request(method, url, **kwargs)
        
        if response.status_code == 429:
            delay = base_delay * (2 ** attempt)
            print(f"Rate limited. Retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
            time.sleep(delay)
            continue
        
        response.raise_for_status()
        return response.json()
    
    raise Exception(f"Max retries ({max_retries}) exceeded due to rate limiting")

# Usage
subscriptions = make_request_with_retry(
    "GET",
    "https://api.redislabs.com/v1/subscriptions"
)
```

### TypeScript

```typescript
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
}

async function makeRequestWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 5, baseDelay = 1000 } = retryOptions;
  
  const headers = {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    ...options.headers
  };
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 429) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return response.json();
  }
  
  throw new Error(`Max retries (${maxRetries}) exceeded due to rate limiting`);
}

// Usage
const subscriptions = await makeRequestWithRetry<{ subscriptions: any[] }>(
  "https://api.redislabs.com/v1/subscriptions"
);
```

**Best Practices:**

- Always implement retry logic with exponential backoff for production applications
- Add jitter (random delay) to prevent thundering herd problems when multiple clients retry simultaneously
- Set a reasonable maximum number of retries (5-10) to avoid infinite loops
- Log rate limit events for monitoring and capacity planning
- Consider implementing request queuing for high-volume batch operations
- Avoid making unnecessary API calls; cache responses where appropriate

**Backoff Formula:**

```
delay = base_delay * (2 ^ attempt) + random_jitter
```

Example with 1 second base delay:
- Attempt 1: ~1s
- Attempt 2: ~2s
- Attempt 3: ~4s
- Attempt 4: ~8s
- Attempt 5: ~16s

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 429 | Too Many Requests | Implement backoff and retry |

Reference: [Redis Cloud API Rate Limits](https://redis.io/docs/latest/operate/rc/api/get-started/use-rest-api/)
