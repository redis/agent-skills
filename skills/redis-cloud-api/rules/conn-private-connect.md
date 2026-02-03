---
title: Configure GCP Private Service Connect
impact: MEDIUM
impactDescription: Enable private connectivity on GCP without VPC peering
tags: connectivity, private-service-connect, psc, gcp, private, endpoint
---

## Configure GCP Private Service Connect

Private Service Connect (PSC) provides private connectivity to Redis Cloud from your GCP VPC without requiring VPC peering. PSC uses Google's private network and doesn't require managing CIDR blocks or route tables.

### List Private Service Connect Services

**Endpoint:** `GET /subscriptions/{subscriptionId}/private-service-connect`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

subscription_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/private-service-connect",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

psc_services = response.json().get("privateServiceConnectServices", [])
for psc in psc_services:
    print(f"ID: {psc['id']}, Status: {psc['status']}")
    print(f"Service Attachment: {psc.get('serviceAttachmentName', 'N/A')}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-service-connect`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const { privateServiceConnectServices } = await response.json();
privateServiceConnectServices.forEach((psc: any) => {
  console.log(`ID: ${psc.id}, Status: ${psc.status}`);
});
```

### Create PSC Endpoint

**Endpoint:** `POST /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints`

After Redis Cloud creates a PSC service, create an endpoint to connect from your VPC:

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "gcpProjectId": "my-gcp-project",
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/my-psc-endpoint"
  }'
```

#### Python

```python
subscription_id = 12345
psc_service_id = 67890

payload = {
    "gcpProjectId": "my-gcp-project",
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/my-psc-endpoint"
}

response = requests.post(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/private-service-connect/{psc_service_id}/endpoints",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"PSC endpoint creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const subscriptionId = 12345;
const pscServiceId = 67890;

const payload = {
  gcpProjectId: "my-gcp-project",
  endpointConnectionName: "projects/my-gcp-project/regions/us-central1/forwardingRules/my-psc-endpoint"
};

const response = await fetch(
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/private-service-connect/${pscServiceId}/endpoints`,
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
console.log(`PSC endpoint creation started. Task ID: ${taskId}`);
```

### Update PSC Endpoint

**Endpoint:** `PUT /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/updated-psc-endpoint"
  }'
```

### Delete PSC Endpoint

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Private Service Connect Setup Workflow:**

1. Create a GCP subscription (PSC service is auto-created)
2. Get the PSC service attachment name via API
3. Create a PSC endpoint (forwarding rule) in your GCP project pointing to the service attachment
4. Register the endpoint via API
5. Use the private endpoint IP to connect to Redis

**PSC vs VPC Peering:**

| Feature | PSC | VPC Peering |
|---------|-----|-------------|
| CIDR management | Not required | Required |
| Route tables | Not required | Must configure |
| Transitive routing | Supported | Not supported |
| Setup complexity | Lower | Higher |
| Availability | GCP only | AWS, GCP |

**PSC Endpoint Statuses:**

| Status | Description |
|--------|-------------|
| `pending` | Endpoint registration in progress |
| `active` | Endpoint is connected |
| `rejected` | Endpoint connection was rejected |
| `failed` | Setup failed |

**Best Practices:**

- PSC is recommended over VPC peering for GCP subscriptions
- No CIDR planning or route table configuration required
- Create the forwarding rule in GCP console first, then register via API
- PSC endpoints can be in different projects than the VPC
- Use PSC for simpler network setup and better security isolation

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check endpoint name format |
| 404 | Not Found | PSC service not found |
| 409 | Conflict | Endpoint already registered |

### Get PSC Service Details

**Endpoint:** `GET /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}`

Get details for a specific PSC service.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get PSC Endpoint Creation Script

**Endpoint:** `GET /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/creationScripts`

Get a script to create the PSC endpoint in your GCP project.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111/creationScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get PSC Endpoint Deletion Script

**Endpoint:** `GET /subscriptions/{subscriptionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/deletionScripts`

Get a script to delete the PSC endpoint from your GCP project.

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/private-service-connect/67890/endpoints/11111/deletionScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

---

## Active-Active Private Service Connect

For Active-Active subscriptions, PSC is managed per-region using region-specific endpoints.

### Get Active-Active PSC Service

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
subscription_id = 12345
region_id = 111

response = requests.get(
    f"https://api.redislabs.com/v1/subscriptions/{subscription_id}/regions/{region_id}/private-service-connect",
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
  `https://api.redislabs.com/v1/subscriptions/${subscriptionId}/regions/${regionId}/private-service-connect`,
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

### Create Active-Active PSC Service

**Endpoint:** `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect`

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Delete Active-Active PSC Service

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Active-Active PSC Endpoints

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create Active-Active PSC Endpoint

**Endpoint:** `POST /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`

```bash
curl -X POST "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "gcpProjectId": "my-gcp-project",
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/my-psc-endpoint"
  }'
```

### Update Active-Active PSC Endpoint

**Endpoint:** `PUT /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointConnectionName": "projects/my-gcp-project/regions/us-central1/forwardingRules/updated-endpoint"
  }'
```

### Delete Active-Active PSC Endpoint

**Endpoint:** `DELETE /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Active-Active PSC Endpoint Creation Script

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/creationScripts`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111/creationScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Get Active-Active PSC Endpoint Deletion Script

**Endpoint:** `GET /subscriptions/{subscriptionId}/regions/{regionId}/private-service-connect/{pscServiceId}/endpoints/{endpointId}/deletionScripts`

```bash
curl -X GET "https://api.redislabs.com/v1/subscriptions/12345/regions/111/private-service-connect/67890/endpoints/11111/deletionScripts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**Standard vs Active-Active PSC:**

| Feature | Standard | Active-Active |
|---------|----------|---------------|
| Endpoint | `/subscriptions/{id}/private-service-connect` | `/subscriptions/{id}/regions/{regionId}/private-service-connect` |
| Scope | Subscription-wide | Per-region |
| Use case | Single-region subscription | Multi-region Active-Active |

Reference: [Private Service Connect](https://redis.io/docs/latest/operate/rc/security/private-service-connect/)
