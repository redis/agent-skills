---
title: Provide a Minimal Docker Compose for Redis
impact: MEDIUM
impactDescription: Standardizes local setups and avoids data loss
tags: docker, compose, deployment, persistence, redisinsight
---

## Provide a Minimal Docker Compose for Redis

When users ask for a container setup, give a minimal `docker-compose.yml` that pins the image, includes a volume for `/data`, and a simple healthcheck. Add Redis Insight only when the user wants a GUI, and provide a no-persistence variant for ephemeral dev or tests.

**Correct:** Minimal, pinned, and persistent Compose setup.

```yaml
services:
  redis:
    image: redis:8.6.0
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis-data:
```

**Correct:** Redis + Redis Insight with persistence and healthchecks (for local dev with a GUI).

```yaml
services:
  redis-database:
    container_name: redis-database
    hostname: redis-database
    image: redis:8.6.0
    command: ["redis-server", "--save", "30", "1"]
    volumes:
      - ./data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD-SHELL", "redis-cli ping | grep PONG"]
      interval: 10s
      retries: 5
      start_period: 5s
      timeout: 5s

  redis-insight:
    container_name: redis-insight
    hostname: redis-insight
    image: redis/redisinsight:3.0.3
    depends_on:
      - redis-database
    environment:
      RI_REDIS_HOST: "redis-database"
      RI_REDIS_PORT: "6379"
    ports:
      - "5540:5540"
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O- http://localhost:5540/api/health/ | grep -q '\"status\":\"up\"'"]
      interval: 10s
      retries: 5
      start_period: 5s
      timeout: 5s
```

**Correct:** Redis without persistence (ephemeral dev or tests).

```yaml
services:
  redis:
    image: redis:8.6.0
    ports:
      - "6379:6379"
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

**When to use:**
- Local development or single-node container setups.
- Documentation or examples that need a working Redis container quickly.
- Redis Insight for GUI-based exploration, indexing, or debugging.
- No-persistence variant for ephemeral dev or integration tests.

**When NOT needed:**
- Kubernetes or managed Redis services where Compose is not used.
- Advanced multi-node deployments with custom orchestration.

Reference: [Redis Docker official image](https://hub.docker.com/_/redis), [Redis Docker tags](https://hub.docker.com/_/redis/tags), [Redis Insight Docker image](https://hub.docker.com/r/redis/redisinsight)
