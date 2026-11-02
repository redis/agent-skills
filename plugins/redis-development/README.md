# Redis Development

Redis best practices for AI coding agents. Use this plugin to design, build, review, and troubleshoot Redis applications: data modeling, Redis Search and vector search, semantic caching, connections, clustering, security, observability, and Iris agent memory.

The agent loads the right skill when your task involves Redis. You can also call a skill directly with its slash command.

## Skills

| Skill | Slash command | What it covers |
|-------|---------------|----------------|
| redis-core | `/redis-core` | Data structures, key naming, memory and TTL, atomic primitives, JSON vs Hash, Streams vs Pub/Sub |
| redis-connections | `/redis-connections` | Pooling, multiplexing, pipelining, client-side caching, timeouts, slow commands |
| redis-search | `/redis-search` | FT.CREATE schema, FT.SEARCH / FT.AGGREGATE / FT.HYBRID, vector similarity (HNSW / FLAT), hybrid retrieval, RAG |
| redis-semantic-cache | `/redis-semantic-cache` | LangCache for LLM responses, similarity threshold tuning, per-task cache separation |
| redis-clustering | `/redis-clustering` | Hash tags for multi-key operations, avoiding CROSSSLOT, reading from replicas |
| redis-security | `/redis-security` | Authentication and TLS, ACL-based least privilege, network bind, firewall, command renaming |
| redis-observability | `/redis-observability` | Key metrics (INFO), SLOWLOG, MEMORY DOCTOR, FT.PROFILE, Redis Insight |
| iris-development | `/iris-development` | Iris Redis Agent Memory: provisioning, SDK auth, session events, long-term memory search |

## Try it

```
Design the Redis layer for this AI agent: long-term memory, semantic caching of LLM calls, and vector search over our docs.
```
```
Add hybrid product search to this app with Redis: vector and keyword ranking, filtered by price and category.
```
```
Get this Redis setup production-ready: ACLs and TLS, cluster-safe keys, connection pooling, and the metrics to alert on.
```

## What this plugin contains

Skills only: Markdown instructions and reference docs. It runs no MCP servers, hooks, or scripts, and it asks for no credentials.

## Links

- Redis: [redis.io](https://redis.io)
- Source and issues: [github.com/redis/agent-skills](https://github.com/redis/agent-skills)
- License: MIT
