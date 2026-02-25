---
title: Use Official Redis Images for Containers
impact: HIGH
impactDescription: Avoids outdated stacks and unnecessary components
tags: docker, containers, images, redisinsight, redis-stack, licensing
---

## Use Official Redis Images for Containers

Redis 8 bundles the Redis Query Engine and core data structures (JSON, time series, probabilistic) in the main server distribution, so the official `redis:<version>` image is the right default for most containers. Use Redis Stack images only when you explicitly need the bundled RedisInsight UI or Redis Stack packaging.

**Correct:** Run the core server from `redis:<version>` and add RedisInsight separately when needed.

```bash
# Core Redis server (pin to a specific tag from Docker Hub)
docker run -d --name redis -p 6379:6379 redis:8.4.0

# Optional GUI
docker run -d --name redisinsight -p 5540:5540 redis/redisinsight:latest
```

**When to use:**
- `redis/redis-stack` for local development when you want RedisInsight bundled in the same container.
- `redis/redis-stack-server` when you specifically want the Redis Stack packaging without RedisInsight.

**When NOT needed:**
- Do not default to `redis/redis-stack` for Redis 8+ server-only deployments.
- Do not recommend separate module installation for JSON/search/time series on Redis 8+ containers.

If licensing comes up, note that Redis 8 is tri-licensed (RSALv2, SSPLv1, AGPLv3); point users to the official license overview for the exact terms.

Reference: [Redis Docker official image](https://hub.docker.com/_/redis), [Redis Docker tags](https://hub.docker.com/_/redis/tags), [Redis Open Source 8.0 release notes](https://redis.io/docs/latest/operate/rs/release-notes/redis-os-8-0-release-notes/), [Redis licensing overview](https://redis.io/legal/licenses/), [Redis Stack Docker image](https://hub.docker.com/r/redis/redis-stack), [Redis Insight Docker image](https://hub.docker.com/r/redis/redisinsight)
