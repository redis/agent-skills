# Redis Agent Skills

A collection of skills for AI coding agents working with Redis. Skills are packaged instructions and resources that extend agent capabilities.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

| Skill | Description |
|-------|-------------|
| [redis-development](skills/redis-development/) | Redis development best practices — data structures, query engine, vector search, caching, and performance optimization. |

## Installation

```bash
npx skills add redis/agent-skills
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
npm install
npm run validate  # Validate rule files
npm run build     # Build AGENTS.md
```

## License

MIT
