---
title: Use Consistent Key Naming Conventions
impact: MEDIUM
impactDescription: Improved maintainability and debugging
tags: keys, naming, conventions, prefixes
---

## Use Consistent Key Naming Conventions

Well-structured key names improve code maintainability, debugging, and enable efficient key scanning.

**Correct:** Use colons as separators with a consistent hierarchy.

```
# Pattern: service:entity:id:attribute
user:1001:profile
user:1001:settings
order:2024:items
cache:api:users:list
session:abc123
```

**Incorrect:** Inconsistent naming, spaces, or very long keys.

```
# These cause confusion and waste memory
User_1001_Profile
my key with spaces
com.mycompany.myapp.production.users.profile.data.1001
```

**Key naming tips:**
- Keep keys short but readable—they consume memory
- Consider key prefixes for multi-tenant applications
- Extract short identifiers from URLs or long strings rather than using the whole thing
- For large binary values, consider using a hash digest as the key instead of the value itself
- Use consistent separators (colons are conventional)

Reference: [Redis Keys](https://redis.io/docs/latest/develop/use/keyspace/)
