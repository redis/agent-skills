# Redis Best Practices

Redis performance optimization rules optimized for AI agents and LLMs. Contains 29 rules across 11 categories.

## Installation

**Claude Code:**
```bash
cp -r skills/redis-best-practices ~/.claude/skills/
```

**Claude.ai:**
Add SKILL.md to project knowledge or paste contents into conversation.

## Usage

The skill activates when working with:
- Redis data structures and key design
- Redis Query Engine (FT.CREATE, FT.SEARCH, FT.AGGREGATE)
- Vector search with RedisVL
- Semantic caching with LangCache
- Connection management and performance optimization

## Rule Categories

| Category | Impact | Prefix | Rules |
|----------|--------|--------|-------|
| Data Structures & Keys | HIGH | `data-` | 2 |
| Memory & Expiration | HIGH | `ram-` | 2 |
| Connection & Performance | HIGH | `conn-` | 4 |
| JSON Documents | MEDIUM | `json-` | 2 |
| Redis Query Engine | HIGH | `rqe-` | 5 |
| Vector Search & RedisVL | HIGH | `vector-` | 4 |
| Semantic Caching | MEDIUM | `semantic-cache-` | 2 |
| Streams & Pub/Sub | MEDIUM | `stream-` | 1 |
| Clustering & Replication | MEDIUM | `cluster-` | 2 |
| Security | HIGH | `security-` | 3 |
| Observability | MEDIUM | `observe-` | 2 |

## Contributing

### Adding a New Rule

1. Choose a section prefix from the table above
2. Copy the template:
   ```bash
   cp rules/_template.md rules/{prefix}-your-rule-name.md
   ```
3. Fill in the content following the template structure
4. Build and validate from the packages directory:
   ```bash
   cd packages/redis-best-practices-build
   npm run validate
   npm run build
   ```

### Rule File Structure

```markdown
---
title: Clear, Action-Oriented Title
impact: HIGH|MEDIUM|LOW
impactDescription: Quantified benefit (e.g., "10x faster")
tags: relevant, keywords
---

## [Title]

[1-2 sentence explanation]

**Correct:** Description of good approach.

```python
# Good example with comments
```

**Incorrect:** Description of problematic approach.

```python
# Bad example with comments
```

Reference: [Link](URL)
```

## References

- [Redis Documentation](https://redis.io/docs/)
- [Redis Query Engine](https://redis.io/docs/latest/develop/interact/search-and-query/)
- [RedisVL Documentation](https://redis.io/docs/latest/develop/clients/redisvl/)
- [LangCache](https://redis.io/docs/latest/develop/ai/langcache/)
