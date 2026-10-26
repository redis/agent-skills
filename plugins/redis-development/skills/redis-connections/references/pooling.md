# Use Connection Pooling or Multiplexing

Reuse connections via a pool or multiplexing instead of creating new connections per request.

**Correct:** Use a connection pool.

**Python** (redis-py):
```python
import redis

# Good: Connection pool - reuses existing connections
pool = redis.ConnectionPool(host='localhost', port=6379, max_connections=50)
r = redis.Redis(connection_pool=pool)
```

**Java** (Jedis 7.2+):
```java
import redis.clients.jedis.RedisClient;

// RedisClient manages a connection pool internally and is thread-safe.
// Create one per application and reuse it.
try (RedisClient jedis = RedisClient.create("redis://localhost:6379")) {
    jedis.set("testKey", "testValue");
}
```

To size the pool, pass a `ConnectionPoolConfig` to the builder:

```java
import redis.clients.jedis.ConnectionPoolConfig;
import redis.clients.jedis.RedisClient;

ConnectionPoolConfig poolConfig = new ConnectionPoolConfig();
poolConfig.setMaxTotal(16);  // default is 8; size to your concurrency

RedisClient jedis = RedisClient.builder()
        .hostAndPort("localhost", 6379)
        .poolConfig(poolConfig)
        .build();
```

Jedis 8.0 removed `JedisPooled` and the public `UnifiedJedis` constructors. Code that uses them does not compile on Jedis 8; replace them with `RedisClient` (standalone), `RedisClusterClient` (Cluster), or `RedisSentinelClient` (Sentinel).

**Correct:** Use multiplexing (Lettuce, NRedisStack).

```java
import io.lettuce.core.RedisClient;  // Lettuce's RedisClient, not Jedis's
import io.lettuce.core.api.StatefulRedisConnection;

// Lettuce uses multiplexing by default - single connection handles all traffic
RedisClient client = RedisClient.create("redis://localhost:6379");
StatefulRedisConnection<String, String> connection = client.connect();

// All commands share the single connection efficiently
connection.sync().set("key", "value");
```

**Incorrect:** Creating new connections per request.

**Python** (redis-py):
```python
# Bad: New connection every time
def get_user(user_id):
    r = redis.Redis(host='localhost', port=6379)  # Don't do this
    return r.get(f"user:{user_id}")
```

**Java** (Jedis):
```java
// Bad: Creating new client per request
public String getUser(String userId) {
    try (RedisClient jedis = RedisClient.create("redis://localhost:6379")) {
        return jedis.get("user:" + userId);  // Don't do this
    }
}
```

**Pooling vs Multiplexing:**
- **Pooling**: Multiple connections shared across requests (redis-py, Jedis, go-redis)
- **Multiplexing**: Single connection handles all traffic (NRedisStack, Lettuce)
- Multiplexing cannot support blocking commands (BLPOP, etc.) as they would stall all callers

Reference: [Connection Pools and Multiplexing](https://redis.io/docs/latest/develop/clients/pools-and-muxing/), [Jedis: Configure a connection pool](https://redis.io/docs/latest/develop/clients/jedis/connect/#configure-a-connection-pool), [Jedis v7 to v8 migration guide](https://redis.github.io/jedis/migration-guides/v7-to-v8/)
