---
title: Choose JSON vs Hash Appropriately
impact: MEDIUM
impactDescription: Optimal data model for your use case
tags: json, hash, data-structures, documents
---

## Choose JSON vs Hash Appropriately

Redis JSON and Hash serve different purposes. Choose based on your data structure and query needs.

| Feature | JSON | Hash |
|---------|------|------|
| **Structure** | Nested objects and arrays | Flat key-value pairs |
| **Path queries** | Yes (`$.preferences.theme`) | No (top-level fields only) |
| **Geospatial indexing** | Yes (with Redis Query Engine) | No |
| **Memory efficiency** | Higher overhead | More efficient |
| **Field-level expiration** | No | Yes (HEXPIRE) |
| **RQE indexing** | Yes | Yes |

**Correct:** Use JSON for nested structures and path queries.

```python
# JSON supports nested structures and deep updates
redis.json().set("user:1001", "$", {
    "name": "Alice",
    "address": {
        "city": "NYC",
        "location": {"lat": 40.7128, "lng": -74.0060}
    }
})

# Update nested field directly
redis.json().set("user:1001", "$.address.city", "Boston")
```

**Correct:** Use Hash for flat objects or when you need field-level expiration.

```python
# Hash is simpler and more memory-efficient for flat data
redis.hset("session:abc", mapping={
    "user_id": "1001",
    "created_at": "2024-01-01",
    "ip": "192.168.1.1"
})

# Field-level expiration (Redis 7.4+)
redis.hexpire("session:abc", 3600, "ip")  # Expire IP field in 1 hour
```

Reference: [Data Type Comparison](https://redis.io/docs/latest/develop/data-types/compare-data-types/#documents)
