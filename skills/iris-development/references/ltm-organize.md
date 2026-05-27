
## Organize Long-Term Memory with namespace, ownerId, topics, and memoryType

LTM records carry four structured fields that exist purely to scope search. They cost nothing extra to populate at write time and make every later search call faster and more precise.

| Field | Type | Purpose | Typical use |
|---|---|---|---|
| `owner_id` / `ownerId` | 1–64 chars `[a-zA-Z0-9-]` | The user/agent the memory is *about* | Multi-tenant scoping — always set this for per-user memories |
| `namespace` | 1–64 chars `[a-zA-Z0-9-]` | Logical bucket within a store | Separate `profile` facts from `interactions` from `tools` |
| `topics` | List of up to 50 tags, each 1–100 chars | Categorical labels | `["preferences", "ui"]`, `["incident", "p1"]` |
| `memory_type` / `memoryType` | `semantic` \| `episodic` \| `message` | What the record *is* | See below |

**`memory_type` semantics:**
- `semantic` — a durable fact ("user prefers dark mode"). Cheapest to keep around long-term; survives across sessions.
- `episodic` — something that happened at a point in time ("user asked about pricing on 2026-05-10"). Pair with `created_at` filters.
- `message` — a raw conversational turn that was deemed worth retaining verbatim.

**Correct:** Populate every applicable field at create time.

**Python:**

```python
from redis_agent_memory import models

agent_memory.bulk_create_long_term_memories(memories=[
    {
        "id":          "user-42-pref-theme",
        "text":        "User 42 prefers dark mode in the dashboard.",
        "memory_type": models.MemoryType.SEMANTIC,
        "owner_id":    "user-42",
        "namespace":   "preferences",
        "topics":      ["ui", "theme"],
    },
    {
        "id":          "user-42-incident-7821",
        "text":        "User 42 hit a 500 on /api/checkout on 2026-05-10 and was refunded.",
        "memory_type": models.MemoryType.EPISODIC,
        "owner_id":    "user-42",
        "namespace":   "interactions",
        "topics":      ["incident", "billing"],
    },
])
```

**TypeScript:**

```typescript
await agentMemory.bulkCreateLongTermMemories({
  memories: [
    {
      id:         "user-42-pref-theme",
      text:       "User 42 prefers dark mode in the dashboard.",
      memoryType: "semantic",
      ownerId:    "user-42",
      namespace:  "preferences",
      topics:     ["ui", "theme"],
    },
    {
      id:         "user-42-incident-7821",
      text:       "User 42 hit a 500 on /api/checkout on 2026-05-10 and was refunded.",
      memoryType: "episodic",
      ownerId:    "user-42",
      namespace:  "interactions",
      topics:     ["incident", "billing"],
    },
  ],
});
```

Later searches can then scope cheaply:

**Python:**

```python
from datetime import datetime, timedelta, timezone

# All preferences for one user
agent_memory.search_long_term_memory(
    filter_={"owner_id": {"eq": "user-42"}, "namespace": {"eq": "preferences"}},
)

# Incidents across all users in the last 7 days
seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
agent_memory.search_long_term_memory(
    text="checkout failure",
    filter_={
        "topics":     {"all": ["incident", "billing"]},
        "created_at": {"gte": seven_days_ago},     # tz-aware UTC datetime
    },
)
```

**TypeScript:**

```typescript
// All preferences for one user
await agentMemory.searchLongTermMemory({
  filter: { ownerId: { eq: "user-42" }, namespace: { eq: "preferences" } },
});

// Incidents across all users in the last 7 days
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
await agentMemory.searchLongTermMemory({
  text: "checkout failure",
  filter: {
    topics:    { all: ["incident", "billing"] },
    createdAt: { gte: sevenDaysAgo },             // Date
  },
});
```

**Incorrect:** Stuffing all of these into the `text` field.

```python
# Bad: structured signals hidden inside free text. Search can't filter on them
# without an LLM re-parse, and similarity threshold becomes the only knob.
agent_memory.bulk_create_long_term_memories(memories=[{
    "id":   "fact-1",
    "text": "[owner=user-42][namespace=preferences][topic=ui] prefers dark mode",
}])
```

**Updating organization later:** `update_long_term_memory(memory_id=..., ...)` / `updateLongTermMemory(memoryId, ...)` accepts `namespace`, `owner_id`, `session_id`, `topics`, and `memory_type`. To clear a field, send an empty string (`""`) — omitting the field leaves it unchanged.

**Avoid leakage between owners.** If a record can be attributed to one user, set `owner_id`. A search request without an `owner_id` filter will happily return facts from any user in the same store.
