
## Choose Session Events vs Long-Term Memory

Redis Agent Memory has two tiers. They serve different jobs — picking the wrong one is the single biggest source of cost and correctness problems.

| Tier | What it stores | Retrieval | Lifetime | Cost shape |
|---|---|---|---|---|
| **Session memory** | Raw, ordered conversation events for one session | Whole session or by `eventId` | Session-scoped TTL (configured at store creation) | Cheap writes, no LLM cost on the write path |
| **Long-term memory** | Extracted facts/summaries/messages | Semantic search across sessions | Default 1 year TTL | Each promotion runs an LLM call |

**Correct:** Append every turn of the conversation as a session event. Let the background promotion worker decide what becomes long-term memory.

**Python:**

```python
from datetime import datetime, timezone
from redis_agent_memory import AgentMemory, models

# Every user/assistant turn → add_session_event. That's it.
agent_memory.add_session_event(
    session_id=session_id,
    actor_id="user-42",
    role=models.MessageRole.USER,
    content=[{"text": user_msg}],
    created_at=datetime.now(timezone.utc),
)
agent_memory.add_session_event(
    session_id=session_id,
    actor_id="agent-1",
    role=models.MessageRole.ASSISTANT,
    content=[{"text": reply}],
    created_at=datetime.now(timezone.utc),
)
# Promotion happens asynchronously — see promotion-overview.
```

**TypeScript:**

```typescript
await agentMemory.addSessionEvent({
  sessionId: sessionId,
  actorId:   "user-42",
  role:      "USER",
  content:   [{ text: userMsg }],
  createdAt: new Date(),
});
await agentMemory.addSessionEvent({
  sessionId: sessionId,
  actorId:   "agent-1",
  role:      "ASSISTANT",
  content:   [{ text: reply }],
  createdAt: new Date(),
});
```

**Correct:** Write to long-term memory directly when you already have a structured fact and don't want to pay for extraction.

**Python:**

```python
# Pre-known fact — skip the LLM and write LTM directly.
agent_memory.bulk_create_long_term_memories(memories=[
    {
        "id":          "user-42-timezone",
        "text":        "User 42 is in Europe/Sofia (UTC+2/+3).",
        "memory_type": models.MemoryType.SEMANTIC,
        "owner_id":    "user-42",
        "topics":      ["profile", "timezone"],
    },
])
```

**TypeScript:**

```typescript
await agentMemory.bulkCreateLongTermMemories({
  memories: [
    {
      id:         "user-42-timezone",
      text:       "User 42 is in Europe/Sofia (UTC+2/+3).",
      memoryType: "semantic",
      ownerId:    "user-42",
      topics:     ["profile", "timezone"],
    },
  ],
});
```

**Incorrect:** Using long-term memory as the conversation buffer.

```python
# Bad: each turn pays for embedding + LTM write, and the agent loses turn order.
for turn in conversation:
    agent_memory.bulk_create_long_term_memories(memories=[{
        "id":          f"{session_id}-{turn.idx}",
        "text":        turn.text,
        "memory_type": models.MemoryType.MESSAGE,
    }])
```

Why it's bad: LTM is vector-indexed (cost per write) and unordered (you re-paginate to reconstruct a session). Session memory is append-only and keeps `createdAt` order for free.

**Rule of thumb:** if you'd want to retrieve it in a *different* future conversation, it belongs in LTM (usually via promotion). If you only need it for the current turn or the rest of this session, it stays in session memory.
