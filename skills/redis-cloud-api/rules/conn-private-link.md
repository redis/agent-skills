---
title: Configure AWS PrivateLink
impact: MEDIUM
impactDescription: Enable private connectivity on AWS without VPC peering
tags: connectivity, private-link, aws, private, endpoint, privatelink
---

## Configure AWS PrivateLink

AWS PrivateLink provides private connectivity to Redis Cloud from your AWS VPC without requiring VPC peering. Traffic stays on the AWS network and doesn't traverse the public internet.

### Get PrivateLink Configuration

**Endpoint:** `GET /subscriptions/{subscriptionId}/private-link`

This is an async operation that returns a taskId.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/private-link",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

# This returns a taskId - poll for results
task_id = response.json().get("taskId")
print(f"Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-link`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Task ID: ${taskId}`);
// Poll task for PrivateLink configuration details
```

### Create PrivateLink

**Endpoint:** `POST /subscriptions/{subscriptionId}/private-link`

Create a new PrivateLink configuration for your subscription.

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Python

```python
subscription_id = 12345

response = requests.post(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/private-link",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json={}
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"PrivateLink creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-link`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  }
);

const { taskId } = await response.json();
console.log(`PrivateLink creation started. Task ID: ${taskId}`);
```

### Delete PrivateLink

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/private-link`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Add PrivateLink Principal (AWS ARN)

**Endpoint:** `POST /subscriptions/{subscriptionId}/private-link/principals`

Add an AWS principal (ARN) that is allowed to connect to your PrivateLink endpoint service.

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "arn:aws:iam::123456789012:root"
  }'
```

#### Python

```python
subscription_id = 12345

payload = {
    "principal": "arn:aws:iam::123456789012:root"
}

response = requests.post(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/private-link/principals",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Principal added. Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const payload = {
  principal: "arn:aws:iam::123456789012:root"
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-link/principals`,
  {
    method: "POST",
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }
);

const { taskId } = await response.json();
console.log(`Principal added. Task ID: ${taskId}`);
```

### Remove PrivateLink Principals

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/private-link/principals`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principals": ["arn:aws:iam::123456789012:root"]
  }'
```

### Get PrivateLink Endpoint Script

**Endpoint:** `GET /subscriptions/{subscriptionId}/private-link/endpoint-script`

Get a script to create the VPC endpoint in your AWS account.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-link/endpoint-script" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Disassociate PrivateLink Connections

**Endpoint:** `PUT /subscriptions/{subscriptionId}/private-link/connections/disassociate`

Disassociate (disconnect) PrivateLink connections.

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/private-link/connections/disassociate" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointIds": ["vpce-0abc123def456789"]
  }'
```

**PrivateLink Setup Workflow:**

1. Create PrivateLink configuration via API
2. Add your AWS account ARN as a principal
3. Get the endpoint script or service name
4. Create a VPC endpoint in your AWS account pointing to the service
5. Connect your applications using the private endpoint

**PrivateLink vs VPC Peering:**

| Feature | PrivateLink | VPC Peering |
|---------|-------------|-------------|
| CIDR management | Not required | Required |
| Direction | Unidirectional (your VPC to Redis) | Bidirectional |
| Transitive routing | Not supported | Not supported |
| Multiple VPCs | Each needs endpoint | Each needs peering |
| Setup complexity | Lower | Higher |

**Principal ARN Formats:**

| Type | Format |
|------|--------|
| Account root | `arn:aws:iam::123456789012:root` |
| IAM user | `arn:aws:iam::123456789012:user/username` |
| IAM role | `arn:aws:iam::123456789012:role/rolename` |

**Best Practices:**

- Use PrivateLink when you don't want to manage CIDR blocks
- Add only the minimum required principals
- PrivateLink provides better security isolation than VPC peering
- Use the endpoint script to simplify VPC endpoint creation
- PrivateLink is AWS-only; use PSC for GCP

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check principal ARN format |
| 404 | Not Found | PrivateLink not configured |
| 409 | Conflict | Principal already exists |

---

## Active-Active AWS PrivateLink

For Active-Active subscriptions, PrivateLink is managed per-region using region-specific endpoints.

### Get Active-Active PrivateLink Configuration

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-link`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345
region_id = 111

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/regions/{region_id}/private-link",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

# Returns taskId - poll for results
task_id = response.json().get("taskId")
print(f"Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;
const regionId = 111;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/${regionId}/private-link`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { taskId } = await response.json();
console.log(`Task ID: ${taskId}`);
```

### Create Active-Active PrivateLink

**Endpoint:** `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-link`

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Delete Active-Active PrivateLink

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-link`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Add Active-Active PrivateLink Principal

**Endpoint:** `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-link/principals`

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": "arn:aws:iam::123456789012:root"
  }'
```

### Remove Active-Active PrivateLink Principals

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-link/principals`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/principals" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "principals": ["arn:aws:iam::123456789012:root"]
  }'
```

### Get Active-Active PrivateLink Endpoint Script

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-link/endpoint-script`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/endpoint-script" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Disassociate Active-Active PrivateLink Connections

**Endpoint:** `PUT /subscriptions/{subscriptionId}/regions/{regionId}/private-link/connections/disassociate`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-link/connections/disassociate" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointIds": ["vpce-0abc123def456789"]
  }'
```

**Standard vs Active-Active PrivateLink:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/private-link` | `/subscriptions/{id}/regions/{regionId}/private-link` |
| Scope | Subscription-wide | Per-region |
| Use case | Single-region subscription | Multi-region Active-Active |

Reference: [AWS PrivateLink](https://redis.io/docs/latest/operate/rc/security/private-link/)
