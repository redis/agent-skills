# Always Use Authentication in Production

Never run Redis without authentication in production environments.

**Correct for new applications:** Use a named ACL user, password and verified TLS.

**Python** (redis-py):
```python
r = redis.Redis(
    host='localhost',
    port=6379,
    username='app_cache',
    password='replace-with-a-strong-password',
    ssl=True,
    ssl_cert_reqs='required'
)
```

**Java** (Jedis):
```java
import redis.clients.jedis.*;
import javax.net.ssl.*;
import java.security.KeyStore;

// Create SSL context with trust store and key store
KeyStore trustStore = KeyStore.getInstance("jks");
trustStore.load(new FileInputStream("./truststore.jks"), "password".toCharArray());

TrustManagerFactory tmf = TrustManagerFactory.getInstance("X509");
tmf.init(trustStore);

SSLContext sslContext = SSLContext.getInstance("TLS");
sslContext.init(null, tmf.getTrustManagers(), null);

JedisClientConfig config = DefaultJedisClientConfig.builder()
    .ssl(true)
    .sslSocketFactory(sslContext.getSocketFactory())
    .user("redisUser")
    .password("redisPassword")
    .build();

JedisPooled jedis = new JedisPooled(new HostAndPort("redis-host", 6379), config);
```

**Incorrect:** Connecting without authentication.

**Python** (redis-py):
```python
# Bad: No authentication
r = redis.Redis(host='localhost', port=6379)
```

**Java** (Jedis):
```java
// Bad: No authentication or TLS
UnifiedJedis jedis = new UnifiedJedis("redis://localhost:6379");
```

**Configuration:**

```
# redis.conf
aclfile /path/to/users.acl
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
```

Create the ACL file with a dedicated application identity and only its required
commands and key patterns; see [ACL examples](acls.md). Provision operator access
before disabling the default user. `requirepass` changes the password of the
`default` ACL user and is a compatibility choice for an existing application,
not the recommended starting point for new services.

Reference: [Redis Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
