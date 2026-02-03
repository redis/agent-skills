---
title: Configure VPC Peering
impact: MEDIUM
impactDescription: Enable private connectivity between Redis Cloud and your VPC
tags: connectivity, vpc, peering, aws, gcp, private, network
---

## Configure VPC Peering

VPC peering creates a private network connection between your Redis Cloud subscription and your cloud provider VPC. This enables secure communication without exposing traffic to the public internet.

### List VPC Peerings

**Endpoint:** `GET /subscriptions/{subscriptionId}/peerings`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/peerings",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

peerings = response.json().get("peerings", [])
for peer in peerings:
    print(f"ID: {peer['peeringId']}, Status: {peer['status']}, VPC: {peer.get('vpcUid', 'N/A')}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/peerings`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { peerings } = await response.json();
peerings.forEach((peer: any) => {
  console.log(`ID: ${peer.peeringId}, Status: ${peer.status}`);
});
```

### Create VPC Peering (AWS)

**Endpoint:** `POST /subscriptions/{subscriptionId}/peerings`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "AWS",
    "region": "us-east-1",
    "awsAccountId": "123456789012",
    "vpcId": "vpc-0abc123def456789",
    "vpcCidrs": ["10.0.0.0/16"]
  }'
```

#### Python

```python
subscription_id = 12345

payload = {
    "provider": "AWS",
    "region": "us-east-1",
    "awsAccountId": "123456789012",
    "vpcId": "vpc-0abc123def456789",
    "vpcCidrs": ["10.0.0.0/16"]
}

response = requests.post(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/peerings",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"VPC peering creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const payload = {
  provider: "AWS",
  region: "us-east-1",
  awsAccountId: "123456789012",
  vpcId: "vpc-0abc123def456789",
  vpcCidrs: ["10.0.0.0/16"]
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/peerings`,
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
console.log(`VPC peering creation started. Task ID: ${taskId}`);
```

### Create VPC Peering (GCP)

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GCP",
    "gcpProjectId": "my-gcp-project",
    "networkName": "my-vpc-network"
  }'
```

### Update VPC Peering

**Endpoint:** `PUT /subscriptions/{subscriptionId}/peerings/{peeringId}`

Update the CIDR ranges for an existing peering.

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "vpcCidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

### Delete VPC Peering

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/peerings/{peeringId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**VPC Peering Workflow (AWS):**

1. Create peering via API (Redis Cloud initiates peering request)
2. Poll task until `processing-completed`
3. Accept the peering request in your AWS console
4. Update your VPC route tables to route traffic to Redis Cloud CIDR
5. Peering status changes to `active`

**VPC Peering Workflow (GCP):**

1. Create peering via API
2. Poll task until `processing-completed`
3. Peering is automatically established (no manual accept needed)
4. Configure firewall rules if necessary

**Peering Statuses:**

| Status | Description |
|--------|-------------|
| `initiating-request` | Peering request being created |
| `pending-acceptance` | Waiting for you to accept in cloud console |
| `active` | Peering is established and working |
| `inactive` | Peering exists but not routing traffic |
| `failed` | Peering creation failed |

**Best Practices:**

- Ensure your VPC CIDR doesn't overlap with Redis Cloud's deployment CIDR
- Configure subscription's `deploymentCIDR` during creation to avoid conflicts
- Accept peering requests promptly; they may expire
- Update route tables in your VPC after peering is active
- Use VPC peering instead of public endpoints for production workloads

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check VPC ID and CIDR format |
| 409 | Conflict | Peering already exists for this VPC |
| 422 | Unprocessable | CIDR overlap or invalid region |

---

## Active-Active VPC Peering

For Active-Active subscriptions, VPC peering is managed per-region using region-specific endpoints.

### List Active-Active VPC Peerings

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/peerings`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/regions/peerings",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

peerings = response.json().get("peerings", [])
for peer in peerings:
    print(f"Region: {peer.get('regionId')}, Peering ID: {peer['peeringId']}, Status: {peer['status']}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/peerings`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { peerings } = await response.json();
peerings.forEach((peer: any) => {
  console.log(`Region: ${peer.regionId}, Peering ID: ${peer.peeringId}, Status: ${peer.status}`);
});
```

### Create Active-Active VPC Peering

**Endpoint:** `POST /subscriptions/{subscriptionId}/regions/peerings`

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "regionId": 111,
    "provider": "AWS",
    "region": "us-east-1",
    "awsAccountId": "123456789012",
    "vpcId": "vpc-0abc123def456789",
    "vpcCidrs": ["10.0.0.0/16"]
  }'
```

### Update Active-Active VPC Peering

**Endpoint:** `PUT /subscriptions/{subscriptionId}/regions/peerings/{peeringId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "vpcCidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

### Delete Active-Active VPC Peering

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/regions/peerings/{peeringId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/peerings/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Standard vs Active-Active VPC Peering:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/peerings` | `/subscriptions/{id}/regions/peerings` |
| Scope | Subscription-wide | Per-region |
| Region ID | Not required | Required in payload |

Reference: [VPC Peering](https://redis.io/docs/latest/operate/rc/security/vpc-peering/)
