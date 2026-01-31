---
title: Index Only Fields You Query
impact: HIGH
impactDescription: Reduces index size and improves write performance
tags: rqe, ft.create, index, schema
---

## Index Only Fields You Query

Create indexes with only the fields you need to search, filter, or sort on.

**Correct:** Index specific fields.

```
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        name TEXT WEIGHT 2.0
        description TEXT
        category TAG SORTABLE
        price NUMERIC SORTABLE
        location GEO
```

**Incorrect:** Over-indexing or indexing unused fields.

```
# Bad: Indexing every field "just in case"
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        name TEXT
        description TEXT
        category TEXT
        subcategory TEXT
        brand TEXT
        sku TEXT
        price NUMERIC
        cost NUMERIC
        margin NUMERIC
        ...
```

**Tips:**
- Start with the minimum required fields
- Add fields as query patterns emerge
- Use `FT.INFO` to monitor index size

Reference: [Redis Search Indexing](https://redis.io/docs/latest/develop/interact/search-and-query/indexing/)

