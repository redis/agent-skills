# Use Hybrid Search for Better Results

Combine vector similarity with attribute filtering for more relevant results. In this rule, "hybrid" means filtered vector search. Redis and RedisVL also use "hybrid search" for text + vector fusion via `FT.HYBRID` / `HybridQuery`.

**Correct:** Apply filters to reduce search space.

```python
from redisvl.query import VectorQuery
from redisvl.query.filter import Num, Tag

filters = (Tag("category") == "technology") & (Num("date") >= 2024) & (Num("date") <= 2025)

query = VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    return_fields=["content", "category", "date"],
    num_results=10,
    filter_expression=filters
)

results = index.query(query)
```

**Incorrect:** Searching entire vector space when filters apply.

```python
# Bad: No filter - searches all vectors then filters client-side
results = index.query(VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    num_results=1000
))
# Client-side filtering - wasteful
filtered = [r for r in results if r["category"] == "technology"]
```

**Tips:**
- Use TAG fields for category filters
- Use NUMERIC fields for date/price ranges
- Redis auto-selects the filtered vector execution strategy; tune `hybrid_policy` only when needed
- For true text + vector fusion, use `HybridQuery` on Redis >= 8.4.0 with redis-py >= 7.1.0; use `AggregateHybridQuery` on earlier Redis versions

Reference: [Redis Vector Search](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/)
