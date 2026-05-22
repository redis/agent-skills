---
name: redis-query-engine
description: Redis Query Engine (RQE) guidance covering FT.CREATE schema design, field type selection (TEXT, TAG, NUMERIC, GEO, GEOSHAPE, VECTOR), DIALECT 2 query syntax, efficient FT.SEARCH and FT.AGGREGATE queries, zero-downtime index updates via aliases, and the SKIPINITIALSCAN option. Use when defining a search index on Hash or JSON documents, picking between TEXT and TAG for filtering, writing FT.SEARCH queries with filters and SORTBY, managing or swapping indexes in production, or troubleshooting slow searches with FT.PROFILE.
license: MIT
metadata:
  author: Redis, Inc.
  version: "0.1.0"
---

# Redis Query Engine

Guidance for using the Redis Query Engine (RQE) to index and search Hash or JSON documents. Covers schema design with `FT.CREATE`, field-type choices, query syntax, index lifecycle management, and the most common performance pitfalls.

## When to apply

- Creating, modifying, or reviewing an RQE index (`FT.CREATE`, `FT.ALTER`).
- Writing or optimizing `FT.SEARCH` / `FT.AGGREGATE` queries.
- Deciding between `TEXT`, `TAG`, `NUMERIC`, `GEO`, `GEOSHAPE`, or `VECTOR` for a field.
- Rolling out a new index schema without downtime.
- Spinning up an index that should only cover newly written keys.

## 1. Use DIALECT 2 (the modern default)

`DIALECT 2` is the baseline. Other dialects (1, 3, 4) are deprecated as of Redis 8. Most modern client libraries already default to it — but specify it explicitly in raw commands for portability.

```
FT.SEARCH idx:products "@name:laptop" DIALECT 2
```

`DIALECT 2` is **required** for vector search queries. It also handles special characters and NULLs predictably.

See [references/dialect.md](references/dialect.md).

## 2. Pick the right field type

The field type decides both what you can query and how fast that query is. Use the narrowest type that supports your access pattern.

| Field type | Use when | Notes |
|---|---|---|
| `TEXT` | Full-text search needed | Tokenized + stemmed; **not** for exact match |
| `TAG` | Exact match / filtering | Add `SORTABLE UNF` for fastest tag queries |
| `NUMERIC` | Range queries, sorting | Prices, counts, timestamps |
| `GEO` | Lat/long point queries | Single points (stores, users) |
| `GEOSHAPE` | Polygon / area queries | Delivery zones, regions |
| `VECTOR` | Similarity search | HNSW or FLAT; see redis-vector-search |

The classic mistake is using `TEXT` for a category or status field because "it's a string." `TAG` is 10× faster for those.

See [references/field-types.md](references/field-types.md).

## 3. Index only what you query — and always set a prefix

`FT.CREATE` without a `PREFIX` indexes **every** matching key in the database; with a wide schema it can blow up index size and write latency.

```
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        name TEXT WEIGHT 2.0
        category TAG SORTABLE
        price NUMERIC SORTABLE
        location GEO
```

Rules of thumb:

- Start with the minimum schema. Add fields as new query patterns emerge.
- Always set `PREFIX` (or filter via `FILTER` expression).
- Use `FT.INFO idx:<name>` to monitor index size after adding fields.
- Use `SORTABLE` only on fields you actually sort by; it has a memory cost.

See [references/index-creation.md](references/index-creation.md).

## 4. Zero-downtime index updates — use aliases

For schema changes in production, keep application queries pointed at an alias and swap the underlying index.

```
FT.CREATE idx:products_v2 ON HASH PREFIX 1 product: SCHEMA ...
FT.ALIASUPDATE products idx:products_v2

# App queries are stable:
FT.SEARCH products "@category:{electronics}"
```

Useful management commands: `FT.INFO`, `FT.DROPINDEX`, `FT._LIST`, `FT.ALIASADD/UPDATE/DEL`.

See [references/index-management.md](references/index-management.md).

## 5. SKIPINITIALSCAN — only when historical data is irrelevant

By default `FT.CREATE` walks all existing keys that match the prefix and indexes them. Use `SKIPINITIALSCAN` only when:

- You're standing up the index for a *new* feature and existing data shouldn't be queryable.
- Existing data is too large to scan synchronously.
- You're indexing event streams where only future events matter.

For most schema migrations, the default (scan everything) is what you want.

See [references/skip-initial-scan.md](references/skip-initial-scan.md).

## 6. Write specific queries, not `*`

Narrow the result set with filters before paging or aggregating.

```
# Good — specific filter, limited fields returned
FT.SEARCH idx:products "@category:{electronics} @price:[100 500]"
    LIMIT 0 20
    RETURN 3 name price category
```

```
# Bad — full scan plus unbounded LIMIT
FT.SEARCH idx:products "*" LIMIT 0 10000
```

Other levers:

- `SORTBY` requires `SORTABLE` on the sort field. Without it, sort is slow.
- `LIMIT` early; the engine still processes everything above the limit if you don't.
- `RETURN` specific fields — don't fetch the whole document if you only need a few.
- Profile with `FT.PROFILE idx:<name> SEARCH QUERY "<query>"` when a query is slow.

See [references/query-optimization.md](references/query-optimization.md).

## References

- [Redis: Query Engine — Indexing](https://redis.io/docs/latest/develop/interact/search-and-query/indexing/)
- [Redis: Query syntax](https://redis.io/docs/latest/develop/interact/search-and-query/query/)
- [Redis: Query dialects](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/dialects/)
- [Redis: Administration (aliases, dropindex)](https://redis.io/docs/latest/develop/interact/search-and-query/administration/)
- [FT.CREATE](https://redis.io/docs/latest/commands/ft.create/)
