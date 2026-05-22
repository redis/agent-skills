---
title: Use Official Redis Images in Testcontainers
impact: MEDIUM
impactDescription: Keeps integration tests aligned with production behavior
tags: testcontainers, docker, images, integration-testing
---

## Use Official Redis Images in Testcontainers

When using Testcontainers, pick the official `redis:<version>` image and pin to the same Redis version you run in production. This keeps behavior consistent across environments and avoids accidental drift.

**Correct:** Pin the official Redis image in Testcontainers.

```java
static final DockerImageName REDIS_IMAGE = DockerImageName.parse("redis:8.4.0");

@Container
static RedisContainer redis = new RedisContainer(REDIS_IMAGE);
```

**When to use:**
- Any integration test that exercises Redis behavior.
- Tests that need Redis 8 features (e.g., RQE search, JSON, time series).

**When NOT needed:**
- Only use `redis/redis-stack` or `redis/redis-stack-server` if you explicitly need the Redis Stack packaging or the Redis Insight UI during tests.

Reference: [Testcontainers Redis module](https://testcontainers.com/modules/redis/), [Redis Docker official image](https://hub.docker.com/_/redis), [Redis Query Engine docs](https://redis.io/docs/latest/develop/ai/search-and-query/)
