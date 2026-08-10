
## Create Long-Term Memories in Bulk with Idempotent IDs

`bulk_create_long_term_memories` (Python) / `bulkCreateLongTermMemories` (TypeScript) accepts up to **100 records per call**. The client supplies the `id` for each record so a retry never creates a duplicate. The response splits into `created` (IDs that landed) and `errors` (per-ID failures).

**Correct:** Generate a deterministic ID per logical fact and batch up to 100.

**Python:**

```python
import uuid
from redis_agent_memory import AgentMemory, models

def upsert_facts(agent_memory: AgentMemory, facts: list[dict]):
    # Cap at 100 per call — the API enforces this.
    res = agent_memory.bulk_create_long_term_memories(memories=[
        {
            "id":          fact["id"],                           # stable, deterministic
            "text":        fact["text"],                         # 1–50000 chars
            "memory_type": fact.get("memory_type", models.MemoryType.SEMANTIC),
            "session_id":  fact.get("session_id"),
            "owner_id":    fact.get("owner_id"),
            "namespace":   fact.get("namespace"),
            "topics":      fact.get("topics", []),
        }
        for fact in facts[:100]
    ])
    # res.created = [...ids...], res.errors = [BulkOperationError(...)]
    return res

# Deterministic IDs make retries safe: same fact → same id → no duplicate.
facts = [{
    "id":         f"user-42-pref-{uuid.uuid5(uuid.NAMESPACE_OID, 'theme:dark')}",
    "text":       "User 42 prefers dark mode.",
    "owner_id":   "user-42",
    "topics":     ["profile", "ui-preferences"],
}]
upsert_facts(agent_memory, facts)
```

**TypeScript:**

```typescript
import { AgentMemory } from "@redis-iris/agent-memory";

async function upsertFacts(
  agentMemory: AgentMemory,
  facts: Array<{
    id: string; text: string;
    memoryType?: "semantic" | "episodic" | "message";
    sessionId?: string; ownerId?: string; namespace?: string;
    topics?: string[];
  }>,
) {
  const res = await agentMemory.bulkCreateLongTermMemories({
    memories: facts.slice(0, 100).map((f) => ({
      id:         f.id,
      text:       f.text,
      memoryType: f.memoryType ?? "semantic",
      sessionId:  f.sessionId,
      ownerId:    f.ownerId,
      namespace:  f.namespace,
      topics:     f.topics ?? [],
    })),
  });
  // res.created: string[], res.errors?: Array<{id: string; error: string}>
  return res;
}
```

**Incorrect:** One call per memory, or random IDs on every retry.

```python
# Bad: N round-trips + N embedding calls — slow and hammers your rate limit.
for fact in facts:
    agent_memory.bulk_create_long_term_memories(memories=[{
        "id":   str(uuid.uuid4()),            # <-- new id on every retry → duplicates on transient failures
        "text": fact["text"],
    }])
```

**Partial-success contract — always inspect `errors`:**

```python
res = upsert_facts(agent_memory, facts)
if res.errors:
    for err in res.errors:
        log.warning("LTM create failed", id=err.id, reason=err.error)
    # res.created IS persisted; do not retry those.
    failed_ids = {e.id for e in res.errors}
    retry_later([f for f in facts if f["id"] in failed_ids])
```

```typescript
const res = await upsertFacts(agentMemory, facts);
if (res.errors?.length) {
  for (const err of res.errors) {
    console.warn("LTM create failed", err.id, err.error);
  }
  const failedIds = new Set(res.errors.map((e) => e.id));
  await retryLater(facts.filter((f) => failedIds.has(f.id)));
}
```

**Constraints:**
- `memories`: 1–100 items per call.
- `id`: 1–64 chars, `[a-zA-Z0-9-]`.
- `text`: 1–50000 chars.
- `memory_type` / `memoryType`: `semantic` | `episodic` | `message`.
- `topics`: up to 50, each 1–100 chars.
- TTL: defaults to **1 year** (`31_536_000` seconds) unless the store's long-term-memory TTL overrides it.

To update a record's text or tags later, use `update_long_term_memory(memory_id=...)` / `updateLongTermMemory(memoryId, ...)` rather than re-creating with the same ID.
