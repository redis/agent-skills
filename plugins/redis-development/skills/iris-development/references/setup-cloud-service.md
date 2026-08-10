
## Create a Memory Service on Redis Cloud

Redis Cloud provisions the memory store, the backing Redis database, the background promotion worker, and the LLM/embedding provider credentials. Each store gets a unique `storeId` and a **store API key** used as a bearer token on every data-plane request.

**Correct:** Provision through the Redis Cloud Agent Memory console.

1. Sign in at [https://cloud.redis.io/#/agent-memory](https://cloud.redis.io/#/agent-memory).
2. Click **New service** and pick the correct settings for the user.
3. After provisioning, copy three values from the console:
   - **Server URL** — the production data-plane URL is `https://gcp-us-east4.memory.redis.io` (your exact URL is shown in the Cloud console)
   - **Store ID** — 32-character UUID without dashes
   - **Store API key** — Bearer token (treat like a secret)
4. Export them so the SDKs can read them from the environment:

```bash
export AGENT_MEMORY_BASE_URL="https://gcp-us-east4.memory.redis.io"
export AGENT_MEMORY_STORE_ID="<your-store-id>"
export AGENT_MEMORY_API_KEY="<your-store-api-key>"
```

5. Install the SDK and run a smoke test.

**Python** — `pip install redis-agent-memory`:

```python
import os
from datetime import datetime, timezone
from redis_agent_memory import AgentMemory, models

with AgentMemory(
    os.environ["AGENT_MEMORY_BASE_URL"],
    store_id=os.environ["AGENT_MEMORY_STORE_ID"],
    api_key=os.environ["AGENT_MEMORY_API_KEY"],
) as agent_memory:
    # Health check
    print(agent_memory.health())

    # Sanity write
    res = agent_memory.add_session_event(
        actor_id="user-42",
        role=models.MessageRole.USER,
        content=[{"text": "hello"}],
        created_at=datetime.now(timezone.utc),   # tz-aware UTC datetime
    )
    print(res.event.event_id)
```

**TypeScript** — `npm add @redis-iris/agent-memory`:

```typescript
import { AgentMemory } from "@redis-iris/agent-memory";

const agentMemory = new AgentMemory({
  serverURL: process.env.AGENT_MEMORY_BASE_URL!,
  storeId:   process.env.AGENT_MEMORY_STORE_ID!,
  apiKey:    process.env.AGENT_MEMORY_API_KEY!,
});

async function smokeTest() {
  console.log(await agentMemory.health());

  const res = await agentMemory.addSessionEvent({
    actorId:   "user-42",
    role:      "USER",
    content:   [{ text: "hello" }],
    createdAt: new Date(),                       // SDK serializes to UTC ISO-8601
  });
  console.log(res.event.eventId);
}

smokeTest();
```

Store the API key in a secrets manager. It scopes access to a single store; rotating it requires regenerating from the Cloud console.

Reference: [Redis Cloud Agent Memory](https://cloud.redis.io/#/agent-memory) · [Python SDK](https://pypi.org/project/redis-agent-memory/) · [TypeScript SDK](https://www.npmjs.com/package/@redis-iris/agent-memory)
