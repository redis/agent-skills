# Redis Agent Skills

A collection of skills for AI coding agents working with Redis. Skills are packaged instructions and resources that extend agent capabilities.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

| Skill | Description |
|-------|-------------|
| [redis-core](skills/redis-core/) | Data structures, key naming, memory and TTL, atomic primitives, JSON vs Hash, Streams vs Pub/Sub. |
| [redis-connections](skills/redis-connections/) | Pooling, multiplexing, pipelining, client-side caching, timeouts, slow commands. |
| [redis-search](skills/redis-search/) | FT.CREATE schema, FT.SEARCH / FT.AGGREGATE / FT.HYBRID, DIALECT 2, vector similarity (HNSW / FLAT), hybrid retrieval, RAG pipelines, zero-downtime index updates. |
| [redis-semantic-cache](skills/redis-semantic-cache/) | LangCache — cache-aside flow for LLM responses, similarity threshold tuning, per-task cache separation. |
| [redis-clustering](skills/redis-clustering/) | Hash tags for multi-key operations, avoiding CROSSSLOT, reading from replicas. |
| [redis-security](skills/redis-security/) | Authentication and TLS, ACL-based least privilege, network bind, firewall, command renaming. |
| [redis-observability](skills/redis-observability/) | Key metrics (INFO), debugging commands (SLOWLOG, MEMORY DOCTOR, FT.PROFILE), Redis Insight. |
| [add-redis-iris](skills/add-redis-iris/) | Redis Iris: detect the agent's framework and route to the right Iris product skill. Start here. |
| [add-agent-memory](skills/add-agent-memory/) | Redis Iris Agent Memory: provision with the `iris` CLI, wire recall and write-back so the agent remembers users across sessions. |
| [add-agent-playbooks](skills/add-agent-playbooks/) | Redis Iris Agent Playbooks: publish procedures (Skills) and approved answers (FAQs), answer from published content only. |
| [add-context-gateway](skills/add-context-gateway/) | Redis Iris Context Gateway: put the agent's MCP servers behind one endpoint and one key, with tool caching and result handles. |
| [add-intent-router](skills/add-intent-router/) | Redis Iris Intent Router: replace hand-written routing with example phrasings and a score threshold. |
| [add-lens](skills/add-lens/) | Redis Iris Lens: trace every agent turn (LLM calls, tokens, tools, retrievals) in the Lens UI. |

## Installation

### Agent Skills CLI

```bash
npx skills add redis/agent-skills
```

### Claude Code Plugin

You can also install the skills as a Claude Code plugin:

```
/plugin install redis-development@claude-plugins-official
```

### ChatGPT and Codex Plugin

The distributable plugin package for ChatGPT and Codex lives at
[`plugins/redis-development/`](plugins/redis-development/). It includes the
required `.codex-plugin/plugin.json` manifest and real copies of every skill.
Archive that directory—not the repository root—when preparing a submission to
the OpenAI plugin submission portal. The archive includes the shared `.mcp.json`,
so it carries the Redis Docs MCP server as well as the skills.

### Cursor Plugin

This repository also includes Cursor plugin packaging. Run this command in chat:

```text
/add-plugin redis
```

The top-level `skills/` directory remains the source of truth. `plugins/redis-development/skills/` holds generated real copies used by the ChatGPT, Codex, and Claude Code plugin package (not symlinks, which plugin installation flows may drop); `npm run sync:plugins` regenerates them and the pre-commit hook keeps them current. See [AGENTS.md](AGENTS.md#where-skills-live).

### Redis Docs MCP server

The Claude Code, ChatGPT and Codex, and Cursor plugins bundle the official Redis documentation MCP
server at `https://redis.io/mcp`, so an agent can look up authoritative docs instead of relying on
stale training data. It needs **no credentials, no local Redis, and no configuration** — a public,
read-only, hosted endpoint that connects automatically once the plugin is enabled.

Three read-only tools: `search` (query the docs index), `fetch` (retrieve a section by id), and
`ask` (a grounded answer with citations).

| Channel | Carries the MCP server? |
|---------|-------------------------|
| Claude Code plugin | Yes |
| ChatGPT / Codex plugin | Yes |
| Cursor plugin | Yes |
| Agent Skills CLI (`npx skills add`) | No — the Agent Skills format has no MCP component |

All three manifests point at one shared [`plugins/redis-development/.mcp.json`](plugins/redis-development/.mcp.json).
To add the server to Claude Code without the plugin:

```bash
claude mcp add --transport http redis-docs https://redis.io/mcp
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**
```
Help me optimize this Redis query
```
```
What data structure should I use for a leaderboard?
```
```
Review my Redis connection handling
```

## Skill Structure

Each skill follows the [agentskills.io specification](https://agentskills.io/specification):

- `SKILL.md` - Instructions for the agent (required)
- `references/` - Long-form content loaded on demand (optional)
- `scripts/` - Helper scripts (optional)
- `assets/` - Static resources (optional)

See [AGENTS.md](AGENTS.md) for the full layout, conventions, and the "Adding a New Skill" walkthrough.

## License

MIT
