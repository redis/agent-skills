---
name: redis-vector-search
description: Redis vector search guidance covering HNSW vs FLAT algorithm choice, vector index configuration (dims, distance metric, datatype), filtered hybrid search combining vector similarity with TAG or NUMERIC filters, and the RAG retrieval pattern with RedisVL. Use when defining a VECTOR field in FT.CREATE, integrating embeddings (OpenAI, Cohere, sentence-transformers), tuning HNSW parameters (M, EF_CONSTRUCTION, EF_RUNTIME), building a retrieval-augmented generation pipeline, or filtering vector results by attribute.
license: MIT
metadata:
  author: Redis, Inc.
  version: "0.1.0"
---

# Redis Vector Search

Guidance for storing and searching embeddings in Redis. Covers index configuration, algorithm selection, hybrid filtering, and the RAG retrieval pattern with RedisVL.

## When to apply

- Defining a `VECTOR` field in `FT.CREATE` (raw RQE) or a RedisVL `IndexSchema`.
- Choosing HNSW vs FLAT and tuning HNSW parameters.
- Adding category, date, or tenant filters to a vector query.
- Building a retrieval-augmented generation (RAG) pipeline on top of Redis.

This skill builds on the `redis-query-engine` skill — vector fields live inside RQE indexes and share the same `FT.CREATE` / `FT.SEARCH` machinery.

## 1. Configure the vector index properly

Three settings must match the embedding model:

- **`DIM`** — the model's output dimensionality (e.g. 1536 for OpenAI `text-embedding-3-small`). A mismatch produces silent garbage.
- **`DISTANCE_METRIC`** — `COSINE` for normalized text embeddings (the common case), `IP` for unnormalized inner-product, `L2` for raw Euclidean.
- **`TYPE` / `datatype`** — usually `FLOAT32`. Use `FLOAT16` or quantized variants only when memory cost is a hard constraint.

Raw RQE:

```
FT.CREATE idx:docs ON HASH PREFIX 1 doc:
    SCHEMA
        content TEXT
        embedding VECTOR HNSW 6
            TYPE FLOAT32
            DIM 1536
            DISTANCE_METRIC COSINE
```

RedisVL:

```python
schema = IndexSchema.from_dict({
    "index": {"name": "idx:docs", "prefix": "doc:"},
    "fields": [
        {"name": "content", "type": "text"},
        {"name": "embedding", "type": "vector", "attrs": {
            "dims": 1536, "algorithm": "HNSW",
            "datatype": "FLOAT32", "distance_metric": "COSINE",
        }},
    ]
})
```

See [references/index-creation.md](references/index-creation.md) for redis-py and RedisVL variants.

## 2. HNSW vs FLAT

| Algorithm | Speed | Accuracy | Memory | Best for |
|---|---|---|---|---|
| **HNSW** | Fast (approximate) | ~95%+ recall (tunable) | Higher | Large datasets (>10k vectors), latency-sensitive |
| **FLAT** | Slow (exact) | 100% | Lower | Small datasets (<10k), accuracy-critical |

Default to **HNSW** for any production-scale workload. Tuning levers:

- `M` — connections per node (16–64). Higher = better recall, more memory.
- `EF_CONSTRUCTION` — build-time graph quality (100–500). Higher = better index, slower build.
- `EF_RUNTIME` — query-time candidate-list size. Higher = better recall, slower queries.

Use **FLAT** when the corpus is small and you need exact results (e.g. semantic dedup over a few thousand items).

See [references/algorithm-choice.md](references/algorithm-choice.md).

## 3. Hybrid search — filter before vector

Apply attribute filters (TAG / NUMERIC) so the engine narrows the search space *before* the vector comparison. Don't fetch a wide result set and then filter client-side — that's slower and less accurate.

```python
from redisvl.query import VectorQuery
from redisvl.query.filter import Num, Tag

filters = (Tag("category") == "technology") & (Num("date") >= 2024)

query = VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    return_fields=["content", "category", "date"],
    num_results=10,
    filter_expression=filters,
)
results = index.query(query)
```

For **text + vector fusion** (BM25-weighted text scoring combined with vector similarity), use `HybridQuery` on Redis ≥ 8.4 with redis-py ≥ 7.1, or `AggregateHybridQuery` on older Redis. That's a different "hybrid" from filtered vector search above.

See [references/hybrid-search.md](references/hybrid-search.md).

## 4. RAG pattern

Standard pipeline: embed the user query → vector search Redis → pass top-K context to the LLM.

```python
# Index documents with embeddings
records = [{"content": doc.content,
            "embedding": embed_model.encode(doc.content).tolist(),
            "source": doc.source}
           for doc in documents]
index.load(records)

# Retrieve relevant context for a user question
q_emb = embed_model.encode(user_question)
results = index.query(VectorQuery(
    vector=q_emb,
    vector_field_name="embedding",
    return_fields=["content", "source"],
    num_results=5,
))

# Generate with retrieved context
context = "\n".join(r["content"] for r in results)
response = llm.generate(f"Context: {context}\n\nQuestion: {user_question}")
```

Practical tips:

- **Match metric to model.** Most modern text embedding models pair best with `COSINE`.
- **Chunk long documents** before indexing — retrieval over 200–500-token chunks usually beats indexing whole pages.
- **Batch inserts** with `index.load([...])` instead of one call per record.
- **Pre-filter with attributes** (tenant, recency, document type) before the vector search.

See [references/rag-pattern.md](references/rag-pattern.md).

## References

- [Redis: Vectors](https://redis.io/docs/latest/develop/ai/search-and-query/vectors/)
- [Redis: RAG quickstart](https://redis.io/docs/latest/develop/get-started/rag/)
- [RedisVL documentation](https://docs.redisvl.com/en/latest/)
