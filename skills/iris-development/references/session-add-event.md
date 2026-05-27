
## Append a Session Event Correctly

`AgentMemory.add_session_event(...)` (Python) / `agentMemory.addSessionEvent(...)` (TypeScript) appends a single event to a session. The session is created on first write; if `session_id` / `sessionId` is omitted the server generates one (32-char UUID without dashes) and returns it on the response. Every successful write also enqueues a promotion job — so payload quality directly affects what lands in long-term memory.

**Correct:** Pass `actor_id`, `role`, `content`, and a **tz-aware UTC `created_at`** on every turn. Carry the same `session_id` for the whole conversation.

**Python** — `created_at` is a `datetime.datetime` (UTC, tz-aware):

```python
from datetime import datetime, timezone
from redis_agent_memory import AgentMemory, models

def append_event(
    agent_memory: AgentMemory,
    *,
    session_id: str,
    actor_id:   str,
    role:       models.MessageRole,
    text:       str,
    metadata:   dict | None = None,
):
    return agent_memory.add_session_event(
        session_id=session_id,                       # client-supplied — keeps the turn ordered with prior turns
        actor_id=actor_id,                           # who said this (user-42, agent-1, system)
        role=role,                                   # MessageRole.USER | .ASSISTANT | .SYSTEM
        content=[{"text": text}],                    # list of typed content parts
        created_at=datetime.now(timezone.utc),       # tz-aware UTC datetime — required
        metadata=metadata,                           # any JSON, ≤ 16 KB
    ).event                                          # → server-assigned eventId, etc.

append_event(
    agent_memory,
    session_id="chat-2026-05-18-42",
    actor_id="user-42",
    role=models.MessageRole.USER,
    text="What did we agree on yesterday?",
)
```

**TypeScript** — `createdAt` is a `Date` (SDK serializes to UTC ISO-8601):

```typescript
import { AgentMemory } from "@redis-iris/agent-memory";

async function appendEvent(
  agentMemory: AgentMemory,
  args: {
    sessionId: string;
    actorId:   string;
    role:      "USER" | "ASSISTANT" | "SYSTEM";
    text:      string;
    metadata?: Record<string, unknown>;
  },
) {
  const res = await agentMemory.addSessionEvent({
    sessionId: args.sessionId,
    actorId:   args.actorId,
    role:      args.role,
    content:   [{ text: args.text }],
    createdAt: new Date(),                         // UTC Date — required
    metadata:  args.metadata,
  });
  return res.event;                                // server-assigned eventId, etc.
}

await appendEvent(agentMemory, {
  sessionId: "chat-2026-05-18-42",
  actorId:   "user-42",
  role:      "USER",
  text:      "What did we agree on yesterday?",
});
```

**Incorrect:** Letting the server generate a new `session_id` on every turn, or passing a naive (tz-less) datetime in Python.

```python
from datetime import datetime

# Bad: omitting session_id on every call creates a new session per turn,
# so the session memory contains exactly one event and promotion has no
# context to extract from.
agent_memory.add_session_event(
    actor_id="user-42",
    role=models.MessageRole.USER,
    content=[{"text": msg}],
    created_at=datetime.now(),                     # <-- naive datetime; ambiguous timezone.
                                                   #     Use datetime.now(timezone.utc).
)
```

**Constraints worth remembering:**
- `store_id`, `session_id`, `actor_id`: 1–64 chars, `[a-zA-Z0-9-]` only.
- `role`: one of `USER`, `ASSISTANT`, `SYSTEM`.
- `content`: list of typed parts; today only `{"text": "..."}` is supported.
- `created_at` / `createdAt`: tz-aware UTC `datetime` (Python) or `Date` (TypeScript). The SDKs serialize to ISO-8601 on the wire.
- `metadata`: any valid JSON document, ≤ 16 KB.
- Session TTL is governed by the store's short-memory TTL (configured at store creation). Each new event refreshes the TTL on the session key.

The response (`res.event` / `result.event`) includes the server-generated `event_id` / `eventId` (32-char UUID without dashes) — store it if you might need `delete_session_event` / `deleteSessionEvent` later. It also includes a `system_timestamp` / `systemTimestamp` (set by the data plane on ingestion) alongside the client-supplied `created_at` — see [`session-retrieval`](session-retrieval.md) for how to use the two timestamps.

### Async (Python)

The Python SDK exposes an `_async` variant for every method when used inside an `async` function:

```python
import asyncio
from datetime import datetime, timezone

async def main():
    async with AgentMemory(URL, store_id=SID, api_key=KEY) as agent_memory:
        await agent_memory.add_session_event_async(
            session_id="chat-1",
            actor_id="user-42",
            role=models.MessageRole.USER,
            content=[{"text": "hi"}],
            created_at=datetime.now(timezone.utc),
        )

asyncio.run(main())
```
