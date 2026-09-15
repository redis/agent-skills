
## Understand Background Memory Promotion

Every successful `add_session_event` / `addSessionEvent` enqueues a **promote-working-memory** job, fire-and-forget. The data plane never blocks on the LLM call; Redis Cloud's worker pool consumes the job, reads the session's events, calls an LLM to extract durable facts, and writes resulting records into long-term memory.

```
┌──────────┐  addSessionEvent  ┌──────────┐   enqueue   ┌──────────────┐
│  Agent   │ ────────────────► │ Data plane│ ─────────► │  Job queue   │
└──────────┘   200 OK          └──────────┘             │  (managed)   │
                                                       └──────┬───────┘
                                                              │ poll
                                                              ▼
                                                       ┌──────────────┐
                                                       │   Worker     │
                                                       │ • read session│
                                                       │ • call LLM   │
                                                       │ • write LTM  │
                                                       └──────────────┘
```

### Deduplication window

Submitting a job per event would mean an LLM call per turn. To prevent that, the worker groups events into time windows. Jobs whose deduplication key would collide are run **only once** for that window.

- Two events landing in the same window for the same session share a deduplication key, so only one promotion job runs for that bucket.
- Window: **5 minutes** (managed by Redis Cloud — not user-configurable today).
- The job is **delayed** until the end of the window so it sees every event in that bucket.

### Eventually consistent — design for it

After an `add_session_event` returns 200, a `search_long_term_memory` for the extracted facts may not see them for *up to one deduplication window plus the LLM round-trip*. Don't assert synchronously in tests; poll.

**Python:**

```python
import time
from redis_agent_memory import AgentMemory

def wait_for_ltm(
    agent_memory: AgentMemory,
    *,
    query:     str,
    owner_id:  str,
    timeout_s: float = 30,
):
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        hits = agent_memory.search_long_term_memory(
            text=query,
            filter_={"owner_id": {"eq": owner_id}},
            limit=5,
        ).memories
        if hits:
            return hits
        time.sleep(1.0)
    raise AssertionError("promotion did not materialize in time")
```

**TypeScript:**

```typescript
import { AgentMemory } from "@redis-iris/agent-memory";

async function waitForLtm(
  agentMemory: AgentMemory,
  args: { query: string; ownerId: string; timeoutMs?: number },
) {
  const deadline = Date.now() + (args.timeoutMs ?? 30_000);
  while (Date.now() < deadline) {
    const res = await agentMemory.searchLongTermMemory({
      text:   args.query,
      filter: { ownerId: { eq: args.ownerId } },
      limit:  5,
    });
    if (res.memories.length) return res.memories;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("promotion did not materialize in time");
}
```

**Incorrect:** Assuming LTM is updated synchronously with the session write.

```python
# Bad: race. The promotion job is enqueued but the worker hasn't run yet.
agent_memory.add_session_event(...)
results = agent_memory.search_long_term_memory(text="...").memories
assert results, "expected the new fact to be retrievable"   # flaky
```

### What gets extracted is not always a fact about the user

Promotion extracts durable facts from a transcript, and a transcript contains
**both speakers**. So some records describe the *assistant's* capabilities
rather than the user — statements like *"the assistant cannot save display
preferences"* or *"the assistant is unable to search by company."*

These read as facts and behave like facts. They are not: they are claims about a
product, and they go stale the moment the product changes. Worse, they were
true when written, so nothing about the record looks wrong.

We shipped a display-preferences feature. The store had already extracted the
assistant's earlier refusal, and after the feature shipped `search_long_term_memory`
handed that record back as context — so the assistant told the user *"I still
can't save that"*, having just saved it. One turn, no error, and the memory
layer was working exactly as designed.

**Filter these out when recalling, rather than trying to stop them being
written.** Extraction is a managed worker; what it produces is not yours to
control, but what you put in a prompt is.

**Python:**

```python
import re

# Claims about the assistant's own capabilities. Narrow on purpose — see below.
ABOUT_THE_ASSISTANT = re.compile(
    r"\b(?:the )?(?:assistant|agent|system|ai)\b[^.]{0,40}\b"
    r"(?:can|cannot|can't|could not|couldn't|is unable|does not support)\b",
    re.IGNORECASE,
)

def usable_memories(memories):
    return [m for m in memories if not ABOUT_THE_ASSISTANT.search(m.text or "")]
```

**Keep the filter narrow, and test it against real records.** Our first version
also matched `said` and `stated`, which dropped genuine user facts — *"she said
she wants to move into platform work"* is exactly the kind of record the store
exists to hold. A recall filter that is too aggressive fails the same way the
stale record does: quietly, by returning less than it should.

Two related habits worth the same treatment:

- **A record's age is part of its meaning.** A `created_at` filter is cheap and
  keeps a claim about last quarter's product out of this quarter's prompt.
- **`namespace` separates kinds of memory, not just tenants.** Anything your
  application wrote deliberately — settings, flags, derived state — belongs in
  its own namespace, so a similarity search over things the user *said* cannot
  return configuration as though the user had said it. See
  [`ltm-organize`](ltm-organize.md).

### What if a promotion fails?

- Submission errors are logged on the data plane but **do not fail the write** — `add_session_event` still returns 200. The trade-off is that a queue outage silently delays promotion until Cloud's monitoring picks it up.
- Worker-side failures (LLM timeout, embedding-provider 429) are retried by the workflow engine.
- Sessions that have stopped receiving events may keep trailing turns un-promoted until the next event for that session arrives.
