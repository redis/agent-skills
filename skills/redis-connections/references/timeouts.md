# Configure Connection Timeouts

Configure appropriate timeout values to improve your application's connection resilience. While most Redis clients set default timeouts, choosing well-tuned values based on your application's usage patterns leads to better failure recovery.

**Correct:** Set timeouts based on your application needs.

```python
r = redis.Redis(
    host='localhost',
    socket_timeout=5.0,          # Read/write timeout - tune based on expected operation time
    socket_connect_timeout=2.0,  # Connection timeout - shorter for fast failure detection
    retry_on_timeout=True        # Automatic retry on timeout
)
```

**Incorrect:** Relying solely on defaults without considering your use case.

```python
# Not ideal: Default timeouts may not match your application's needs
r = redis.Redis(host='localhost')

# For example, if your app needs fast failure detection,
# the default timeouts might be too generous
```

**Considerations:**
- Set `socket_connect_timeout` shorter than `socket_timeout` for quick connection failure detection
- For latency-sensitive apps, use tighter timeouts with retry logic
- For batch operations, allow longer timeouts to complete large operations
- Consider using health checks alongside timeouts for robust failure handling

## Two failures that present as silence, not as an error

Timeouts exist so a broken connection *fails*. These two get past a correctly
configured timeout and produce no diagnostic at all — which is worse than a slow
connection, because silence is indistinguishable from a slow test, a slow
request, or a hung worker.

### 1. The wrong URL scheme against a TLS-only endpoint

A managed endpoint that requires TLS does not reject a plaintext connection with
a TLS error. It **resets the connection**, or accepts the socket and never
answers. Measured against the same endpoint, seconds apart:

```
redis://…:12703   → ECONNRESET
rediss://…:12703  → PONG
```

`ECONNRESET` reads as a network fault, so the natural next moves are firewall
rules, DNS, and the allowlist — none of which is the problem. Nothing in the
error mentions TLS.

**Use `rediss://` for any Redis Cloud or otherwise TLS-enabled endpoint,** and
check the scheme *first* when a connection fails with a reset or a hang:

```python
# redis-py: the scheme is what selects TLS
r = redis.from_url("rediss://default:…@host:12703", socket_connect_timeout=2.0)
```

```javascript
// node-redis: same — `rediss:` selects TLS, `redis:` does not
const client = createClient({ url: "rediss://default:…@host:12703" });
```

An endpoint can also *become* TLS-only without a code change on your side, so a
comment asserting "this endpoint is plaintext" has a shelf life. Treat the
scheme as configuration, not as a constant.

### 2. A retry policy with no ceiling turns a dead endpoint into a hang

`socket_connect_timeout` bounds **one attempt**. It does not bound *how many
attempts are made*. If the client's reconnect policy retries indefinitely — the
default in several clients, including `node-redis`'s pool — then the call that
establishes the connection never settles and never throws. There is no timeout
to tune, because no single operation has timed out.

This is especially unpleasant in test suites: a `before`/`setUp` hook that
never settles stops the run mid-way with no failing assertion and no stack, and
has to be killed. It looks exactly like a slow test.

**Give the retry policy a ceiling, and make exhausting it an error.**

```javascript
// node-redis: returning an Error from reconnectStrategy stops reconnecting
// and surfaces it, instead of retrying forever.
const MAX_RETRIES = 5;

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5_000,
    reconnectStrategy: (retries) =>
      retries >= MAX_RETRIES
        ? new Error(`Redis did not answer in ${MAX_RETRIES} attempts`)
        : Math.min(50 * 2 ** retries, 1_000),
  },
});
```

```python
# redis-py: a bounded Retry, rather than leaving reconnection open-ended
from redis.backoff import ExponentialBackoff
from redis.retry import Retry
from redis.exceptions import ConnectionError

r = redis.Redis(
    host="host", port=12703, ssl=True,
    socket_connect_timeout=2.0,
    retry=Retry(ExponentialBackoff(), retries=5),
    retry_on_error=[ConnectionError],
)
```

Make the exhaustion message name the likely causes, including the one above —
the two failure modes are indistinguishable from the outside, and whoever reads
that message is, by definition, looking at no other evidence.

Reference: [Redis Client Configuration](https://redis.io/docs/latest/develop/clients/)
