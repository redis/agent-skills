---
title: Configure Maintenance Windows
impact: MEDIUM
impactDescription: Control when maintenance operations occur
tags: maintenance, windows, scheduling, updates
---

## Configure Maintenance Windows

Maintenance windows control when Redis Cloud performs updates, patches, and other maintenance operations on your Pro subscriptions. Configure windows to minimize impact during peak usage.

**Endpoint: `GET /subscriptions/{subscriptionId}/maintenance-windows`**

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

const headers = {
  "x-api-key": process.env.REDIS_API_KEY!,
  "x-api-secret-key": process.env.REDIS_API_SECRET!
};

const subscriptionId = 12345;

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/maintenance-windows`,
  { headers }
);

const data = await response.json();
console.log(`Mode: ${data.mode}`);  // 'automatic' or 'manual'

if (data.windows) {
  data.windows.forEach((window: any, i: number) => {
    console.log(`Window ${i + 1}:`);
    console.log(`  Days: ${window.days.join(", ")}`);
    console.log(`  Start: ${window.startHour}:00 UTC`);
    console.log(`  Duration: ${window.durationInHours} hours`);
  });
}
```

```python
import os
import requests

BASE_URL = "https://api.redislabs.com/v1"
headers = {
    "x-api-key": os.environ["REDIS_API_KEY"],
    "x-api-secret-key": os.environ["REDIS_API_SECRET"]
}

subscription_id = 12345

response = requests.get(
    f"{BASE_URL}/subscriptions/{subscription_id}/maintenance-windows",
    headers=headers
)
response.raise_for_status()

data = response.json()
print(f"Mode: {data.get('mode')}")

for i, window in enumerate(data.get("windows", []), 1):
    print(f"Window {i}:")
    print(f"  Days: {', '.join(window['days'])}")
    print(f"  Start: {window['startHour']}:00 UTC")
    print(f"  Duration: {window['durationInHours']} hours")
```

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/maintenance-windows" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Endpoint: `PUT /subscriptions/{subscriptionId}/maintenance-windows`**

```typescript
const subscriptionId = 12345;

// Set manual maintenance windows
const payload = {
  mode: "manual",
  windows: [
    {
      days: ["Sunday"],
      startHour: 2,
      durationInHours: 4
    },
    {
      days: ["Wednesday"],
      startHour: 3,
      durationInHours: 4
    }
  ]
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/maintenance-windows`,
  {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Maintenance windows update started. Task ID: ${taskId}`);
```

```python
payload = {
    "mode": "manual",
    "windows": [
        {
            "days": ["Sunday"],
            "startHour": 2,
            "durationInHours": 4
        },
        {
            "days": ["Wednesday"],
            "startHour": 3,
            "durationInHours": 4
        }
    ]
}

response = requests.put(
    f"{BASE_URL}/subscriptions/{subscription_id}/maintenance-windows",
    headers={**headers, "Content-Type": "application/json"},
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Maintenance windows update started. Task ID: {task_id}")
```

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/maintenance-windows" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "manual",
    "windows": [
      {
        "days": ["Sunday"],
        "startHour": 2,
        "durationInHours": 4
      },
      {
        "days": ["Wednesday"],
        "startHour": 3,
        "durationInHours": 4
      }
    ]
  }'
```

**Switch to Automatic Mode:**

```typescript
const payload = {
  mode: "automatic"
  // No windows needed for automatic mode
};

const response = await fetch(
  `${BASE_URL}/subscriptions/${subscriptionId}/maintenance-windows`,
  {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);
```

**Maintenance Window Configuration:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `automatic` or `manual` |
| `windows` | array | Required when mode is `manual` |
| `windows[].days` | array | Days of week (e.g., `["Sunday", "Wednesday"]`) |
| `windows[].startHour` | integer | Start hour in UTC (0-23) |
| `windows[].durationInHours` | integer | Window duration (minimum 4 hours) |

**Day Values:**

- `Sunday`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`

**Mode Comparison:**

| Mode | Description |
|------|-------------|
| `automatic` | Redis Cloud schedules maintenance as needed |
| `manual` | Maintenance only occurs during specified windows |

**Best Practices:**

- Set maintenance windows during low-traffic periods
- Configure at least 2 windows per week for timely updates
- Use UTC times and convert from your local timezone
- Minimum window duration is 4 hours
- Up to 7 windows can be configured
- Consider time zones for globally distributed teams

**Example: Weekend Maintenance:**

```json
{
  "mode": "manual",
  "windows": [
    {
      "days": ["Saturday", "Sunday"],
      "startHour": 2,
      "durationInHours": 6
    }
  ]
}
```

**Example: Weekday Off-Hours:**

```json
{
  "mode": "manual",
  "windows": [
    {
      "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "startHour": 3,
      "durationInHours": 4
    }
  ]
}
```

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check window configuration format |
| 404 | Not Found | Subscription doesn't exist |
| 422 | Unprocessable | Invalid day names or hours |

Reference: [https://redis.io/docs/latest/operate/rc/subscriptions/maintenance/](https://redis.io/docs/latest/operate/rc/subscriptions/maintenance/)
