
## Authenticate the SDK with a Store API Key

Every data-plane request carries `Authorization: Bearer <store-api-key>`. The SDKs add this header for you — just pass the key (and store ID) at client construction. Both SDKs follow the same convention:

| Field | Python | TypeScript | Environment variable |
|---|---|---|---|
| Server URL | `server_url` (1st positional) | `serverURL` | (set yourself, e.g. `AGENT_MEMORY_BASE_URL`) |
| API key | `api_key` | `apiKey` | `AGENT_MEMORY_API_KEY` |
| Store ID | `store_id` (global) | `storeId` (global) | `AGENT_MEMORY_STORE_ID` |

`store_id` / `storeId` is a *global parameter* — set it on the client once and every per-store operation uses it by default. You can still override it per call.

**Correct:** Read the key from a secrets manager (or environment) and construct the client once per process.

**Python:**

```python
import os
from redis_agent_memory import AgentMemory

# Construct once at startup; reuse across requests.
# The `with` block ensures the underlying httpx client is closed cleanly.
def make_client() -> AgentMemory:
    return AgentMemory(
        os.environ["AGENT_MEMORY_BASE_URL"],         # e.g. https://gcp-us-east4.memory.redis.io
        store_id=os.environ["AGENT_MEMORY_STORE_ID"],
        api_key=os.environ["AGENT_MEMORY_API_KEY"],
    )

with make_client() as agent_memory:
    agent_memory.health()
```

**TypeScript:**

```typescript
import { AgentMemory } from "@redis-iris/agent-memory";

// Construct once at module scope; the SDK is safe to share across requests.
export const agentMemory = new AgentMemory({
  serverURL: process.env.AGENT_MEMORY_BASE_URL!,
  storeId:   process.env.AGENT_MEMORY_STORE_ID!,
  apiKey:    process.env.AGENT_MEMORY_API_KEY!,
});

await agentMemory.health();
```

**Incorrect:** Hard-coding the key, building the client per request, or constructing the bearer header by hand.

```python
# Bad: key in source — leaks through git history and any traceback log.
agent_memory = AgentMemory(
    "https://gcp-us-east4.memory.redis.io",
    store_id="01HZ...",
    api_key="sk-live-abc123...",       # <-- never
)

# Bad: new client per request — wastes the underlying TCP/TLS pool.
def handle(req):
    with AgentMemory(URL, store_id=SID, api_key=KEY) as agent_memory:
        return agent_memory.get_session_memory(session_id=req.session_id)
```

```typescript
// Bad: rebuilding the Authorization header manually defeats the SDK's typing,
// retry, and error-class machinery.
const res = await fetch(`${URL}/v1/stores/${SID}/session-memory/events`, {
  method:  "POST",
  headers: { Authorization: `Bearer ${KEY}` },
  body:    JSON.stringify(event),
});
```

**Rotation:** Regenerate the key from the Cloud console. There is no short-lived-token flow — rotation is the only mitigation if a key leaks.

**Per-operation override:** Both SDKs accept a `store_id` / `storeId` argument on every call, which overrides the global. Use this when one process talks to multiple stores; do not use it to "scope" calls — global is fine for single-store apps.

Reference: [Redis Cloud Agent Memory](https://cloud.redis.io/#/agent-memory)
