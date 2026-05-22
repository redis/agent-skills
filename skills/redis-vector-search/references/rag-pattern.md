# Implement RAG Pattern Correctly

Store documents with embeddings, retrieve relevant context, and pass to LLM.

**Correct:** Full RAG pipeline with RedisVL.

```python
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery

# 1. Store documents with embeddings
records = []
for doc in documents:
    records.append({
        "content": doc["content"],
        "embedding": embed_model.encode(doc["content"]).tolist(),
        "source": doc["source"]
    })

index.load(records)

# 2. Query with vector similarity
query_embedding = embed_model.encode(user_question)
results = index.query(VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    return_fields=["content", "source"],
    num_results=5
))

# 3. Pass context to LLM
context = "\n".join([r["content"] for r in results])
response = llm.generate(f"Context: {context}\n\nQuestion: {user_question}")
```

**Best practices:**
- Match your distance metric to your embedding model; many modern text embeddings already work well with COSINE
- Batch inserts using `index.load()` with lists
- Set appropriate M and EF_CONSTRUCTION for HNSW based on dataset size
- Use filters to reduce the search space before vector comparison
- Consider chunking long documents for better retrieval

Reference: [Redis RAG Quickstart](https://redis.io/docs/latest/develop/get-started/rag/)
