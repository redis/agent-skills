# Always Use Authentication in Production

Never run Redis without authentication in production environments.

**Correct:** Use password and TLS.

**Python** (redis-py):
```python
r = redis.Redis(
    host='localhost',
    port=6379,
    password='your-strong-password',
    ssl=True,
    ssl_cert_reqs='required'
)
```

**Java** (Jedis 7.2+):
```java
import redis.clients.jedis.*;
import java.io.File;

// TLS with a trust store (and, if the server requires it, a client key store)
SslOptions sslOptions = SslOptions.builder()
    .truststore(new File("./truststore.jks"), "password".toCharArray())
    .trustStoreType("jks")
    .sslVerifyMode(SslVerifyMode.FULL)  // verify the certificate and hostname
    .build();

JedisClientConfig config = DefaultJedisClientConfig.builder()
    .sslOptions(sslOptions)
    .user("redisUser")
    .password("redisPassword")
    .build();

RedisClient jedis = RedisClient.builder()
    .hostAndPort(new HostAndPort("redis-host", 6379))
    .clientConfig(config)
    .build();
```

Jedis 8.0 deprecated the legacy `ssl()`, `sslSocketFactory()`, `sslParameters()` and `hostnameVerifier()` setters in favor of `SslOptions`, and enforces TLS hostname verification by default: a certificate whose CN/SAN does not match the host now fails the handshake.

**Incorrect:** Connecting without authentication.

**Python** (redis-py):
```python
# Bad: No authentication
r = redis.Redis(host='localhost', port=6379)
```

**Java** (Jedis):
```java
// Bad: No authentication or TLS
RedisClient jedis = RedisClient.create("redis://localhost:6379");
```

**Configuration:**

```
# redis.conf
requirepass your-strong-password
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
```

Reference: [Redis Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
