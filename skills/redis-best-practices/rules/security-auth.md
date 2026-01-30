---
title: Always Use Authentication in Production
impact: HIGH
impactDescription: Prevents unauthorized access to your data
tags: security, authentication, password, tls, ssl
---

## Always Use Authentication in Production

Never run Redis without authentication in production environments.

**Correct:** Use password and TLS.

```python
r = redis.Redis(
    host='localhost',
    port=6379,
    password='your-strong-password',
    ssl=True,
    ssl_cert_reqs='required'
)
```

**Incorrect:** Connecting without authentication.

```python
# Bad: No authentication
r = redis.Redis(host='localhost', port=6379)
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

