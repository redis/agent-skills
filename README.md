# Redis Agent Skills

A collection of skills for AI coding agents working with Redis. Skills are packaged instructions and resources that extend agent capabilities.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

### redis-best-practices

Redis performance optimization and best practices. Contains 29 rules across 11 categories, prioritized by impact.

**Use when:**
- Writing code that interacts with Redis
- Choosing data structures or designing key schemas
- Using Redis Query Engine (FT.CREATE, FT.SEARCH, FT.AGGREGATE)
- Building vector search or RAG applications with RedisVL
- Implementing semantic caching with LangCache
- Optimizing Redis performance and memory usage

**Categories covered:**
- Data Structures & Keys (High)
- Memory & Expiration (High)
- Connection & Performance (High)
- JSON Documents (Medium)
- Redis Query Engine (High)
- Vector Search & RedisVL (High)
- Semantic Caching (Medium)
- Streams & Pub/Sub (Medium)
- Clustering & Replication (Medium)
- Security (High)
- Observability (Medium)

## Installation

```bash
npx skills add redis/redis-agent-skills
```

## Usage

Skills are automatically available once installed. The agent will use them when relevant tasks are detected.

**Examples:**
```
Help me optimize this Redis query
```
```
What data structure should I use for a leaderboard?
```
```
Review my Redis connection handling
```

## Skill Structure

Each skill contains:
- `SKILL.md` - Instructions for the agent
- `AGENTS.md` - Compiled rules (generated for rule-based skills)
- `rules/` - Individual rule files (for rule-based skills)
- `scripts/` - Helper scripts for automation (optional)

## Building

For rule-based skills, build the compiled AGENTS.md:

```bash
cd packages/redis-best-practices-build
npm install
npm run validate  # Validate rule files
npm run build     # Build AGENTS.md
```

## License

MIT
