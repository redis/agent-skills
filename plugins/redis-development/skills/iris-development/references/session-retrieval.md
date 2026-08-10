
## Retrieve Session Memory and Individual Events

The SDK exposes three read paths against session memory; pick the narrowest one for the job.

| Python | TypeScript | Returns | Use when |
|---|---|---|---|
| `get_session_memory(session_id=...)` | `getSessionMemory(sessionId)` | All events for the session in order, plus `owner_id` | Rebuilding the prompt context for a conversation |
| `get_session_event(session_id=..., event_id=...)` | `getSessionEvent(sessionId, eventId)` | One event | You already have the `eventId` (e.g. from `addSessionEvent` response) |
| `list_sessions(limit=..., page_token=...)` | `listSessions({limit, pageToken})` | Page of session IDs + `total` | Admin/debug listing of sessions in a store |

The session's `owner_id` is set from the **first** event's `actor_id` and is immutable for the lifetime of the session.

**Correct:** Fetch the whole session when reconstructing the agent's working context.

**Python:**

```python
def load_session(agent_memory, session_id: str) -> list:
    res = agent_memory.get_session_memory(session_id=session_id)
    # res.session_id, res.owner_id, res.events (ordered by created_at)
    return res.events
```

**TypeScript:**

```typescript
async function loadSession(agentMemory: AgentMemory, sessionId: string) {
  const res = await agentMemory.getSessionMemory(sessionId);
  // res.sessionId, res.ownerId, res.events (ordered by createdAt)
  return res.events;
}
```

**Two timestamps on each event.** Every `SessionEvent` in the response carries:

- `created_at` / `createdAt` — the **client-supplied** UTC timestamp you passed at write time. This is what the agent considers "when the turn happened" and what events are ordered by.
- `system_timestamp` / `systemTimestamp` — a **server-set** UTC timestamp recording when the data plane ingested the event. Useful for diagnostics (e.g. clock skew between agent and server, or detecting replayed events with stale `created_at` values).

Both are `datetime` (Python) / `Date` (TypeScript) on the SDK side; serialized as UTC ISO-8601 on the wire.

**Correct:** Page through sessions for admin tools.

**Python:**

```python
def iter_session_ids(agent_memory):
    token = None
    while True:
        page = agent_memory.list_sessions(limit=200, page_token=token)
        yield from page.sessions
        token = page.next_page_token
        if not token:
            return
```

**TypeScript:**

```typescript
async function* iterSessionIds(agentMemory: AgentMemory) {
  let pageToken: string | undefined;
  while (true) {
    const page = await agentMemory.listSessions({ limit: 200, pageToken });
    yield* page.sessions;
    if (!page.nextPageToken) return;
    pageToken = page.nextPageToken;
  }
}
```

**Incorrect:** Paging the full session list to find one event you already have an ID for.

```python
# Bad: O(sessions) just to find one eventId you already have.
for sid in iter_session_ids(agent_memory):
    for ev in load_session(agent_memory, sid):
        if ev.event_id == target_event_id:
            return ev
```

Use `get_session_event` / `getSessionEvent` instead — it is an O(1) lookup.

**Pagination limits:**
- `list_sessions.limit` defaults to 100, max 1000.
- `next_page_token` / `nextPageToken` is opaque — pass it back verbatim, don't try to decode it.

**Deletion:**
- `delete_session_memory(session_id=...)` / `deleteSessionMemory(sessionId)` removes the entire session and all its events.
- `delete_session_event(session_id=..., event_id=...)` / `deleteSessionEvent(sessionId, eventId)` removes one event.
- Already-promoted long-term memories are **not** affected — delete those separately via `bulk_delete_long_term_memories` / `bulkDeleteLongTermMemories`.
