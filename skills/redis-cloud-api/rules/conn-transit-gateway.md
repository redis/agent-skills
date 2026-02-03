---
title: Configure AWS Transit Gateway
impact: MEDIUM
impactDescription: Connect Redis Cloud to multiple VPCs via Transit Gateway
tags: connectivity, transit-gateway, tgw, aws, network, hub-spoke
---

## Configure AWS Transit Gateway

AWS Transit Gateway enables hub-and-spoke connectivity between Redis Cloud and multiple VPCs in your AWS account. This is useful when you need to connect Redis Cloud to many VPCs without creating individual peering connections.

### List Transit Gateways

**Endpoint:** `GET /subscriptions/{subscriptionId}/transitGateways`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/transitGateways" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/transitGateways",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

tgws = response.json().get("transitGateways", [])
for tgw in tgws:
    print(f"ID: {tgw['id']}, TGW ID: {tgw['awsTgwUid']}, Status: {tgw['status']}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/transitGateways`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { transitGateways } = await response.json();
transitGateways.forEach((tgw: any) => {
  console.log(`ID: ${tgw.id}, TGW ID: ${tgw.awsTgwUid}, Status: ${tgw.status}`);
});
```

### Register Transit Gateway

**Endpoint:** `POST /subscriptions/{subscriptionId}/transitGateways`

First, share your Transit Gateway with Redis Cloud's AWS account using AWS Resource Access Manager (RAM).

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/transitGateways" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "awsTgwUid": "tgw-0abc123def456789",
    "awsAccountId": "123456789012",
    "cidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

#### Python

```python
subscription_id = 12345

payload = {
    "awsTgwUid": "tgw-0abc123def456789",
    "awsAccountId": "123456789012",
    "cidrs": ["10.0.0.0/16", "10.1.0.0/16"]
}

response = requests.post(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/transitGateways",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Transit Gateway registration started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const payload = {
  awsTgwUid: "tgw-0abc123def456789",
  awsAccountId: "123456789012",
  cidrs: ["10.0.0.0/16", "10.1.0.0/16"]
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/transitGateways`,
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
console.log(`Transit Gateway registration started. Task ID: ${taskId}`);
```

### Accept TGW Resource Share Invitation

**Endpoint:** `PUT /subscriptions/{subscriptionId}/transitGateways/invitations/{tgwInvitationId}/accept`

After registering the Transit Gateway, Redis Cloud creates a RAM resource share. Accept it:

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/invitations/98765/accept" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create Transit Gateway Attachment

**Endpoint:** `POST /subscriptions/{subscriptionId}/transitGateways/{TgwId}/attachment`

After accepting the resource share, create an attachment:

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Update Transit Gateway Attachment CIDRs

**Endpoint:** `PUT /subscriptions/{subscriptionId}/transitGateways/{TgwId}/attachment`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "cidrs": ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]
  }'
```

### Delete Transit Gateway Attachment

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/transitGateways/{TgwId}/attachment`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Transit Gateway Setup Workflow:**

1. Create a Transit Gateway in your AWS account
2. Share the Transit Gateway with Redis Cloud using AWS RAM
3. Register the Transit Gateway via API
4. Accept the resource share invitation via API
5. Create the Transit Gateway attachment via API
6. Configure Transit Gateway route tables in AWS

**Transit Gateway Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Registration in progress |
| `available` | Ready for attachment |
| `attached` | Attachment created and active |
| `failed` | Setup failed |

**Best Practices:**

- Use Transit Gateway when connecting to more than 2-3 VPCs
- Transit Gateway is AWS-only; use VPC peering for GCP
- Ensure the Transit Gateway is in the same region as your subscription
- Configure Transit Gateway route tables to route traffic to Redis Cloud
- CIDR blocks must not overlap with Redis Cloud's deployment CIDR

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check TGW ID format and CIDRs |
| 404 | Not Found | TGW not found or not shared |
| 409 | Conflict | Attachment already exists |

### List TGW Invitations

**Endpoint:** `GET /subscriptions/{subscriptionId}/transitGateways/invitations`

List pending Transit Gateway resource share invitations.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/invitations" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Reject TGW Resource Share Invitation

**Endpoint:** `PUT /subscriptions/{subscriptionId}/transitGateways/invitations/{tgwInvitationId}/reject`

Reject a Transit Gateway resource share invitation.

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/transitGateways/invitations/98765/reject" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

---

## Active-Active Transit Gateway

For Active-Active subscriptions, Transit Gateway is managed per-region using region-specific endpoints.

### List Active-Active Transit Gateways

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345
region_id = 111

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/regions/{region_id}/transitGateways",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

tgws = response.json().get("transitGateways", [])
for tgw in tgws:
    print(f"TGW ID: {tgw['awsTgwUid']}, Status: {tgw['status']}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;
const regionId = 111;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/${regionId}/transitGateways`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { transitGateways } = await response.json();
transitGateways.forEach((tgw: any) => {
  console.log(`TGW ID: ${tgw.awsTgwUid}, Status: ${tgw.status}`);
});
```

### List Active-Active TGW Invitations

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/invitations`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/invitations" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Accept Active-Active TGW Invitation

**Endpoint:** `PUT /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/invitations/{tgwInvitationId}/accept`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/invitations/98765/accept" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Reject Active-Active TGW Invitation

**Endpoint:** `PUT /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/invitations/{tgwInvitationId}/reject`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/invitations/98765/reject" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create Active-Active TGW Attachment

**Endpoint:** `POST /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/{TgwId}/attachment`

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Update Active-Active TGW Attachment CIDRs

**Endpoint:** `PUT /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/{TgwId}/attachment`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "cidrs": ["10.0.0.0/16", "10.1.0.0/16"]
  }'
```

### Delete Active-Active TGW Attachment

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/transitGateways/{TgwId}/attachment`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/transitGateways/67890/attachment" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Standard vs Active-Active Transit Gateway:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/transitGateways` | `/subscriptions/{id}/regions/{regionId}/transitGateways` |
| Scope | Subscription-wide | Per-region |
| Use case | Single-region subscription | Multi-region Active-Active |

Reference: [Transit Gateway](https://redis.io/docs/latest/operate/rc/security/aws-transit-gateway/)
