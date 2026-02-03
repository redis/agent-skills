---
title: Manage AWS Cloud Accounts
impact: LOW
impactDescription: Configure BYOA (Bring Your Own Account) for AWS deployments
tags: cloud-accounts, aws, byoa, bring-your-own-account
---

## Manage AWS Cloud Accounts

Cloud accounts enable BYOA (Bring Your Own Account) deployments where Redis Cloud provisions resources in your AWS account instead of Redis-managed infrastructure. This provides greater control over billing, compliance, and network configuration.

### List Cloud Accounts

**Endpoint:** `GET /cloud-accounts`

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/cloud-accounts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/cloud-accounts",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

accounts = response.json().get("cloudAccounts", [])
for account in accounts:
    print(f"ID: {account['id']}, Name: {account['name']}, Status: {account['status']}")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/cloud-accounts", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { cloudAccounts } = await response.json();
cloudAccounts.forEach((account: any) => {
  console.log(`ID: ${account.id}, Name: ${account.name}, Status: ${account.status}`);
});
```

### Get Single Cloud Account

**Endpoint:** `GET /cloud-accounts/{cloudAccountId}`

```bash
curl -X GET "https://api.redislabs.com/v1/cloud-accounts/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

### Create Cloud Account

**Endpoint:** `POST /cloud-accounts`

#### curl

```bash
curl -X POST "https://api.redislabs.com/v1/cloud-accounts" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-aws",
    "provider": "AWS",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "accessSecretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "consoleUsername": "redis-cloud-user",
    "consolePassword": "SecureConsolePassword123!",
    "signInLoginUrl": "https://123456789012.signin.aws.amazon.com/console"
  }'
```

#### Python

```python
payload = {
    "name": "production-aws",
    "provider": "AWS",
    "accessKeyId": os.environ["AWS_ACCESS_KEY_ID"],
    "accessSecretKey": os.environ["AWS_SECRET_ACCESS_KEY"],
    "consoleUsername": "redis-cloud-user",
    "consolePassword": os.environ["AWS_CONSOLE_PASSWORD"],
    "signInLoginUrl": "https://123456789012.signin.aws.amazon.com/console"
}

response = requests.post(
    "https://api.redislabs.com/v1/cloud-accounts",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"],
        "Content-Type": "application/json"
    },
    json=payload
)
response.raise_for_status()

task_id = response.json()["taskId"]
print(f"Cloud account creation started. Task ID: {task_id}")
```

#### TypeScript

```typescript
const payload = {
  name: "production-aws",
  provider: "AWS",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  accessSecretKey: process.env.AWS_SECRET_ACCESS_KEY!,
  consoleUsername: "redis-cloud-user",
  consolePassword: process.env.AWS_CONSOLE_PASSWORD!,
  signInLoginUrl: "https://123456789012.signin.aws.amazon.com/console"
};

const response = await fetch("https://api.redislabs.com/v1/cloud-accounts", {
  method: "POST",
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const { taskId } = await response.json();
console.log(`Cloud account creation started. Task ID: ${taskId}`);
```

### Update Cloud Account

**Endpoint:** `PUT /cloud-accounts/{cloudAccountId}`

```bash
curl -X PUT "https://api.redislabs.com/v1/cloud-accounts/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-aws-renamed",
    "accessKeyId": "AKIAIOSFODNN7NEWKEY",
    "accessSecretKey": "newSecretKeyValue"
  }'
```

### Delete Cloud Account

**Endpoint:** `DELETE /cloud-accounts/{cloudAccountId}`

```bash
curl -X DELETE "https://api.redislabs.com/v1/cloud-accounts/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

**AWS IAM Requirements:**

The IAM user/role needs these permissions:
- EC2 (instances, VPCs, security groups)
- S3 (for backups)
- CloudWatch (for monitoring)
- Auto Scaling
- IAM (limited, for service roles)

**Redis vs BYOA Comparison:**

| Feature | Redis-Managed | BYOA |
|---------|---------------|------|
| Billing | Redis invoices | Your AWS bill |
| Infrastructure control | Redis manages | You own resources |
| Compliance | Redis certifications | Your compliance scope |
| Network | Redis VPCs | Your VPCs |
| Availability | AWS only | AWS only |

**Cloud Account Statuses:**

| Status | Description |
|--------|-------------|
| `draft` | Account created but not validated |
| `active` | Account validated and ready |
| `error` | Validation failed |

**Best Practices:**

- Create a dedicated IAM user for Redis Cloud with minimum required permissions
- Use separate cloud accounts for different environments (dev, staging, prod)
- Rotate AWS credentials periodically
- Never commit AWS credentials to source control
- Test cloud account validation before creating subscriptions
- BYOA is only available for Pro subscriptions

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | Check AWS credentials format |
| 403 | Forbidden | IAM permissions insufficient |
| 409 | Conflict | Cloud account name already exists |

Reference: [Bring Your Own Account](https://redis.io/docs/latest/operate/rc/cloud-integrations/aws-cloud-accounts/)
