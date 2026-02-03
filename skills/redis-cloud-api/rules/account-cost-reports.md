---
title: Cost Reports
impact: LOW
impactDescription: Track and analyze Redis Cloud spending
tags: cost, billing, reports, spending, finance
---

## Cost Reports

Access cost reports to track spending, analyze resource usage, and support financial planning for Redis Cloud deployments.

### List Cost Reports

**Endpoint:** `GET /cost-report`

Returns available cost reports for the account.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/cost-report" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
import os
import requests

response = requests.get(
    "https://api.redislabs.com/v1/cost-report",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

reports = response.json().get("costReports", [])
for report in reports:
    print(f"Report ID: {report.get('id')}")
    print(f"Period: {report.get('period')}")
    print(f"Total Cost: ${report.get('totalCost', 0):.2f}")
    print("---")
```

#### TypeScript

```typescript
const response = await fetch("https://api.redislabs.com/v1/cost-report", {
  headers: {
    "x-api-key": process.env.REDIS_API_KEY!,
    "x-api-secret-key": process.env.REDIS_API_SECRET!
  }
});

const { costReports } = await response.json();
costReports.forEach((report: any) => {
  console.log(`Report ID: ${report.id}`);
  console.log(`Period: ${report.period}`);
  console.log(`Total Cost: $${report.totalCost?.toFixed(2) ?? "0.00"}`);
  console.log("---");
});
```

### Get Cost Report Details

**Endpoint:** `GET /cost-report/{costReportId}`

Returns detailed breakdown for a specific cost report.

#### curl

```bash
curl -X GET "https://api.redislabs.com/v1/cost-report/12345" \
  -H "x-api-key: $REDIS_API_KEY" \
  -H "x-api-secret-key: $REDIS_API_SECRET"
```

#### Python

```python
cost_report_id = 12345

response = requests.get(
    f"https://api.redislabs.com/v1/cost-report/{cost_report_id}",
    headers={
        "x-api-key": os.environ["REDIS_API_KEY"],
        "x-api-secret-key": os.environ["REDIS_API_SECRET"]
    }
)
response.raise_for_status()

report = response.json()
print(f"Report ID: {report.get('id')}")
print(f"Period: {report.get('period')}")
print(f"Total Cost: ${report.get('totalCost', 0):.2f}")

# Breakdown by subscription
subscriptions = report.get("subscriptions", [])
for sub in subscriptions:
    print(f"\nSubscription: {sub.get('name')} (ID: {sub.get('id')})")
    print(f"  Cost: ${sub.get('cost', 0):.2f}")
    
    # Breakdown by database
    databases = sub.get("databases", [])
    for db in databases:
        print(f"    Database: {db.get('name')} - ${db.get('cost', 0):.2f}")
```

#### TypeScript

```typescript
const costReportId = 12345;

const response = await fetch(
  `https://api.redislabs.com/v1/cost-report/${costReportId}`,
  {
    headers: {
      "x-api-key": process.env.REDIS_API_KEY!,
      "x-api-secret-key": process.env.REDIS_API_SECRET!
    }
  }
);

const report = await response.json();
console.log(`Report ID: ${report.id}`);
console.log(`Period: ${report.period}`);
console.log(`Total Cost: $${report.totalCost?.toFixed(2) ?? "0.00"}`);

// Breakdown by subscription
report.subscriptions?.forEach((sub: any) => {
  console.log(`\nSubscription: ${sub.name} (ID: ${sub.id})`);
  console.log(`  Cost: $${sub.cost?.toFixed(2) ?? "0.00"}`);
  
  // Breakdown by database
  sub.databases?.forEach((db: any) => {
    console.log(`    Database: ${db.name} - $${db.cost?.toFixed(2) ?? "0.00"}`);
  });
});
```

**Cost Report Fields:**

| Field | Description |
|-------|-------------|
| `id` | Unique report identifier |
| `period` | Billing period (e.g., "2024-01") |
| `totalCost` | Total cost for the period |
| `currency` | Currency code (e.g., "USD") |
| `subscriptions` | Breakdown by subscription |
| `generatedAt` | When the report was generated |

**Subscription Cost Breakdown:**

| Field | Description |
|-------|-------------|
| `id` | Subscription ID |
| `name` | Subscription name |
| `cost` | Total subscription cost |
| `databases` | Breakdown by database |
| `networkCost` | Network transfer costs |
| `storageCost` | Backup storage costs |

**Database Cost Breakdown:**

| Field | Description |
|-------|-------------|
| `id` | Database ID |
| `name` | Database name |
| `cost` | Total database cost |
| `memoryCost` | Memory allocation cost |
| `throughputCost` | Throughput cost |

**Use Cases:**

| Use Case | Approach |
|----------|----------|
| Monthly billing review | List reports, get current month |
| Cost allocation by team | Use database tags + report breakdown |
| Budget tracking | Compare report totals to budget |
| Chargeback | Export subscription/database costs |
| Cost optimization | Identify high-cost databases |

**Example: Calculate Cost by Tag**

```python
# Assuming you've tagged databases with "team" tag
def get_costs_by_team(report):
    team_costs = {}
    
    for sub in report.get("subscriptions", []):
        for db in sub.get("databases", []):
            # You'd need to fetch database details to get tags
            team = db.get("tags", {}).get("team", "untagged")
            team_costs[team] = team_costs.get(team, 0) + db.get("cost", 0)
    
    return team_costs

# Print costs by team
costs_by_team = get_costs_by_team(report)
for team, cost in costs_by_team.items():
    print(f"{team}: ${cost:.2f}")
```

**Best Practices:**

- Review cost reports monthly to track spending trends
- Use database tags to enable cost allocation by team or project
- Set up alerts when costs exceed thresholds
- Compare Pro vs Essentials costs for optimization opportunities
- Export reports for integration with finance systems

**Common Errors:**

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | API key lacks billing access |
| 404 | Not Found | Report ID doesn't exist |

Reference: [Redis Cloud Billing](https://redis.io/docs/latest/operate/rc/billing-and-payments/)
