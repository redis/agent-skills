
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

### A value your code reads must live in a structured field, not only in `text`

The examples above put the *category* in `topics` and the *value* in the sentence — `topics: ["ui", "theme"]`, with "dark mode" appearing only inside `text`. That is fine while the text is read by a human or matched semantically. It becomes a silent-failure generator the moment application code branches on the value.

Reading the theme back then means either re-parsing the sentence or running a similarity search. And if the sentence is ever reworded — a copy edit, a typo fix, a change of tone — every stored record becomes unreadable and the caller falls back to its default. **Nothing raises an error.** A copy edit becomes a data-loss event, discovered months later as "the feature never worked".

Encode the value as a `key:value` topic. Topics are filterable and round-trip verbatim, colon included.

**Correct:** the sentence is documentation; the topic is the value.

**Python:**

```python
agent_memory.bulk_create_long_term_memories(memories=[{
    "id":          "user-42-pref-theme",
    # Prose, because the store is shared with memories the user actually said
    # and `theme=dark` would be unpleasant to come across. Nothing parses it.
    "text":        "User 42 prefers dark mode in the dashboard.",
    "memory_type": models.MemoryType.SEMANTIC,
    "owner_id":    "user-42",
    "namespace":   "preferences",
    # `ui` and `theme` categorize. `theme:dark` is what code reads.
    "topics":      ["ui", "theme", "theme:dark"],
}])
```

**TypeScript:**

```typescript
await agentMemory.bulkCreateLongTermMemories({
  memories: [{
    id:         "user-42-pref-theme",
    text:       "User 42 prefers dark mode in the dashboard.",
    memoryType: "semantic",
    ownerId:    "user-42",
    namespace:  "preferences",
    topics:     ["ui", "theme", "theme:dark"],
  }],
});
```

Decode against your own allowed set rather than trusting the topic. A record can carry any string, so an unrecognised value must read as *unset* — which means your default — rather than reaching the UI as a value it has never heard of:

**Python:**

```python
ALLOWED_THEMES = ("dark", "light")

def theme_of(record) -> str | None:
    for topic in record.topics or []:
        if topic.startswith("theme:"):
            value = topic[len("theme:"):]
            return value if value in ALLOWED_THEMES else None
    return None
```

And the value is now something the store can filter on, which the sentence never was:

**Python:**

```python
agent_memory.search_long_term_memory(
    filter_={"owner_id": {"eq": "user-42"}, "topics": {"all": ["theme:dark"]}},
)
```

**Rule of thumb:** if rewording `text` would change what your application does, the value is in the wrong field.

**Reading one known record is a `get`, not a search.** When the id is derivable — `f"{user_id}-pref-theme"` — fetch it by id (see [`ltm-bulk-create`](ltm-bulk-create.md) for idempotent ids). A stored setting is not something to recall approximately: a similarity threshold that is slightly too strict returns nothing and the caller cannot tell "unset" from "not found", so the setting applies intermittently — worse than one that never applies at all.

### `memory_type` is a closed set

`semantic`, `episodic` and `message` are the only values a store accepts. The API field description mentions a *"custom type registered on the store"*, but an unregistered value is rejected —

```
400 Invalid Request
memories[0]: memory type "preference" is not registered on this store
```

— so do not model a domain concept as a memory type. Use `semantic` for a durable fact and put the discriminator in `topics`, where it is filterable with `eq` / `in` / `all`.

**Updating organization later:** `update_long_term_memory(memory_id=..., ...)` / `updateLongTermMemory(memoryId, ...)` accepts `namespace`, `owner_id`, `session_id`, `topics`, and `memory_type`. To clear a field, send an empty string (`""`) — omitting the field leaves it unchanged.

**Avoid leakage between owners.** If a record can be attributed to one user, set `owner_id`. A search request without an `owner_id` filter will happily return facts from any user in the same store.
