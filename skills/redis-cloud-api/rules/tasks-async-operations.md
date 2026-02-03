---
title: Poll Task Status for Async Operations
impact: HIGH
impactDescription: Required for tracking operation completion
tags: tasks, async, polling, lifecycle, status, taskId
---

## Poll Task Status for Async Operations

Most Redis Cloud API write operations (create, update, delete) are asynchronous. They return immediately with a `taskId` that you must poll to track completion. The task API returns the operation status and, when complete, the resource ID.

**Async Response Structure:**

```json
{
  "taskId": "task-uuid-here",
  "commandType": "subscriptionCreateRequest",
  "status": "received",
  "description": "Task request received and is being processed",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Task Statuses:**

| Status | Meaning |
|--------|---------|
| `received` | Task received, not yet started |
| `processing-in-progress` | Task is being executed |
| `processing-completed` | Task completed successfully |
| `processing-error` | Task failed |

### List All Tasks

**Endpoint:** `GET /tasks`

List all tasks for the account with optional filtering.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/tasks" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/tasks",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

tasks = response.json().get("tasks", [])
for task in tasks:
    print(f"Task ID: {task['taskId']}, Status: {task['status']}, Type: {task.get('commandType', 'N/A')}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/tasks", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { tasks } = await response.json();
tasks.forEach((task: any) => {
  console.log(`Task ID: ${task.taskId}, Status: ${task.status}, Type: ${task.commandType ?? "N/A"}`);
});
```

### Get Task Status

**Endpoint:** `GET /tasks/{taskId}`

### curl

```bash
# Create a subscription (returns taskId)
response=$(curl -s -X POST "https://api.redislabs.com/v1/subscriptions" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-subscription",
    "cloudProviders": [{"provider": "AWS", "regions": [{"region": "us-east-1"}]}],
    "databases": [{"name": "my-database", "datasetSizeInGb": 1}]
  }')

task_id=$(echo "$response" | jq -r '.taskId')
echo "Task ID: $task_id"

# Poll until complete
while true; do
  task=$(curl -s -X GET "https://api.redislabs.com/v1/tasks/$task_id" \
    -H "x-api-key: $REDIS_API_KEY" \
    -H "x-api-secret-key: $REDIS_API_SECRET")
  
  status=$(echo "$task" | jq -r '.status')
  echo "Status: $status"
  
  if [ "$status" = "processing-completed" ]; then
    resource_id=$(echo "$task" | jq -r '.response.resourceId')
    echo "Completed! Resource ID: $resource_id"
    break
  elif [ "$status" = "processing-error" ]; then
    echo "Error: $(echo "$task" | jq -r '.response.error.description')"
    exit 1
  fi
  
  sleep 10
done
```

### Python

```python
import os
import time
import requests
from typing import Any, Optional

BASE_URL = "https://api.redislabs.com/v1"

def get_headers() -> dict:
    return {
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    }

def wait_for_task(
    task_id: str,
    poll_interval: int = 10,
    timeout: int = 1800  # 30 minutes
) -> dict:
    """Poll task status until completion or timeout."""
    start_time = time.time()
    
    while True:
        if time.time() - start_time > timeout:
            raise TimeoutError(f"Task {task_id} timed out after {timeout}s")
        
        response = requests.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers=get_headers()
        )
        response.raise_for_status()
        task = response.json()
        
        status = task.get("status")
        print(f"Task {task_id}: {status}")
        
        if status == "processing-completed":
            return task.get("response", {})
        
        if status == "processing-error":
            error = task.get("response", {}).get("error", {})
            raise Exception(f"Task failed: {error.get('description', 'Unknown error')}")
        
        time.sleep(poll_interval)

def create_subscription(payload: dict) -> int:
    """Create a subscription and wait for completion."""
    # Start the async operation
    response = requests.post(
        f"{BASE_URL}/subscriptions",
        headers=get_headers(),
        json=payload
    )
    response.raise_for_status()
    task_id = response.json()["taskId"]
    print(f"Started task: {task_id}")
    
    # Wait for completion
    result = wait_for_task(task_id)
    subscription_id = result.get("resourceId")
    print(f"Subscription created: {subscription_id}")
    return subscription_id

# Usage
subscription_id = create_subscription({
    "name": "my-subscription",
    "cloudProviders": [{
        "provider": "AWS",
        "regions": [{"region": "us-east-1"}]
    }],
    "databases": [{
        "name": "my-database",
        "datasetSizeInGb": 1
    }]
})
```

### TypeScript

```typescript
const BASE_URL = "https://api.redislabs.com/v1";

function getHeaders(): Record<string, string> {
  return {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  };
}

interface TaskResponse {
  taskId: string;
  status: string;
  response?: {
    resourceId?: number;
    error?: {
      type?: string;
      description?: string;
    };
  };
}

async function waitForTask(
  taskId: string,
  pollInterval = 10000,
  timeout = 1800000
): Promise<any> {
  const startTime = Date.now();
  
  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
    }
    
    const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const task: TaskResponse = await response.json();
    console.log(`Task ${taskId}: ${task.status}`);
    
    if (task.status === "processing-completed") {
      return task.response;
    }
    
    if (task.status === "processing-error") {
      const error = task.response?.error;
      throw new Error(`Task failed: ${error?.description ?? "Unknown error"}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

async function createSubscription(payload: object): Promise<number> {
  // Start the async operation
  const response = await fetch(`${BASE_URL}/subscriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  const { taskId } = await response.json();
  console.log(`Started task: ${taskId}`);
  
  // Wait for completion
  const result = await waitForTask(taskId);
  console.log(`Subscription created: ${result.resourceId}`);
  return result.resourceId;
}

// Usage
const subscriptionId = await createSubscription({
  name: "my-subscription",
  cloudProviders: [{
    provider: "AWS",
    regions: [{ region: "us-east-1" }]
  }],
  databases: [{
    name: "my-database",
    datasetSizeInGb: 1
  }]
});
```

**Best Practices:**

- Always poll the task API after any create, update, or delete operation
- Use reasonable poll intervals (10-30 seconds) to avoid rate limiting
- Implement timeouts to prevent indefinite waiting (30 minutes is typical for subscriptions)
- Store the `taskId` for later reference or debugging
- The `response.resourceId` contains the ID of the created/modified resource
- For subscription creation, database IDs are in `response.resource.databases[].databaseId`

**Dry Run Mode:**

Use `"dryRun": true` in create requests to validate without actually creating resources:

```json
{
  "name": "test-subscription",
  "dryRun": true,
  ...
}
```

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 404 | Task not found | Verify taskId is correct |
| `processing-error` | Operation failed | Check `response.error.description` for details |

Reference: [API Request Lifecycle](https://redis.io/docs/latest/operate/rc/api/get-started/process-lifecycle/)
