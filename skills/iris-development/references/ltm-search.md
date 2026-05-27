
## Search Long-Term Memory Semantically with Filters

`search_long_term_memory(...)` (Python) / `searchLongTermMemory(...)` (TypeScript) runs a vector search over LTM records and applies structured filters in the same call. Combining both is the supported path — do not pull a wide vector result and filter on the client.

**Correct:** Pre-filter by the structured fields you already know, then rank by semantic similarity.

**Python:**

```python
from redis_agent_memory import AgentMemory, models

def recall(
    agent_memory: AgentMemory,
    *,
    owner_id:  str,
    query:     str,
    namespace: str | None = None,
    k:         int        = 5,
):
    filt = {
        "owner_id":    {"eq": owner_id},
        "memory_type": {"in": ["semantic", "episodic"]},
    }
    if namespace is not None:
        filt["namespace"] = {"eq": namespace}

    res = agent_memory.search_long_term_memory(
        text=query,                              # embedded server-side
        similarity_threshold=0.7,                # normalized cosine, 0–1
        filter_op=models.FilterConjunction.ALL,  # AND across filter keys
        filter_=filt,                            # NB: trailing underscore — `filter` is reserved in Python
        limit=k,                                 # 1–100, default 10
    )
    return res.memories
```

**TypeScript:**

```typescript
import { AgentMemory } from "@redis-iris/agent-memory";

async function recall(
  agentMemory: AgentMemory,
  args: { ownerId: string; query: string; namespace?: string; k?: number },
) {
  const res = await agentMemory.searchLongTermMemory({
    text:                args.query,
    similarityThreshold: 0.7,
    filterOp:            "all",                  // AND across filter keys
    filter: {
      ownerId:    { eq: args.ownerId },
      ...(args.namespace ? { namespace: { eq: args.namespace } } : {}),
      memoryType: { in: ["semantic", "episodic"] },
    },
    limit: args.k ?? 5,
  });
  return res.memories;
}
```

**Incorrect:** Querying with only `text` and filtering client-side.

```python
# Bad: pulls up to 100 unrelated records per user, then re-filters in Python.
# Pays the vector-search cost on the full store, and capped at 100 results
# you may miss the one you needed.
hits = agent_memory.search_long_term_memory(text=query, limit=100).memories
for m in hits:
    if m.owner_id == owner_id and m.namespace == namespace:
        ...
```

**Filter operators (per field):**

| Field | Operators |
|---|---|
| `session_id`, `owner_id`, `namespace` | `eq`, `ne`, `in`, `all` |
| `topics`, `memory_type` | `eq`, `ne`, `in`, `all` (tag filter) |
| `created_at` | `gt`, `lt`, `gte`, `lte`, `eq` (tz-aware `datetime` / `Date`) |

`filter_op` / `filterOp` controls how the **top-level filter fields** combine: `"all"` (default, AND) or `"any"` (OR). Inside one field, `eq` / `ne` / `in` / `all` are mutually exclusive — set exactly one.

**Similarity threshold:** Normalized cosine similarity (0–1). Start at 0.7 and tune per workload — too high returns empty pages; too low returns noise.

**Pagination:** Pass `next_page_token` / `nextPageToken` back verbatim. Don't decode it; the server may change the encoding.

```python
def iter_results(agent_memory, *, query: str, owner_id: str):
    token = None
    while True:
        page = agent_memory.search_long_term_memory(
            text=query,
            filter_={"owner_id": {"eq": owner_id}},
            limit=50,
            page_token=token,
        )
        yield from page.memories
        token = page.next_page_token
        if not token:
            return
```

```typescript
async function* iterResults(
  agentMemory: AgentMemory,
  args: { query: string; ownerId: string },
) {
  let pageToken: string | undefined;
  while (true) {
    const page = await agentMemory.searchLongTermMemory({
      text: args.query,
      filter: { ownerId: { eq: args.ownerId } },
      limit: 50,
      pageToken,
    });
    yield* page.memories;
    if (!page.nextPageToken) return;
    pageToken = page.nextPageToken;
  }
}
```

**No-query browsing:** Omit `text` to apply only the structured filters (vector ranking is skipped, results are returned in record order).
