# Redis Agent Skills

A collection of skills for AI coding agents working with Redis. Skills are packaged instructions and resources that extend agent capabilities.

Skills follow the [Agent Skills](https://agentskills.io/) format.

## Available Skills

| Skill | Description |
|-------|-------------|
| [redis-development](skills/redis-development/) | Redis development best practices — data structures, query engine, vector search, caching, and performance optimization. |

## Installation

### Agent Skills CLI

```bash
npx skills add redis/agent-skills
```

### Claude Code Plugin

You can also install the skills as a Claude Code plugin:

```
/plugin marketplace add redis/agent-skills
/plugin install redis-development@redis
```

### Cursor Plugin

This repository also includes Cursor plugin packaging. Run this command in chat:

```text
/add-plugin redis-development
```

The top-level `skills/` directory remains the source of truth. Plugin folders symlink only the skill directories they expose.

### Optional: Redis MCP setup

The plugin includes the official Redis MCP server (`redis/mcp-redis`) via `plugins/redis-development/mcp.json`.

If you do not set any env vars, Redis MCP uses its defaults (`127.0.0.1:6379`).

For custom connections, set environment variables before starting your MCP client:

```bash
export REDIS_URL=redis://username:password@host:6379/0
```

Or use individual settings:

```bash
export REDIS_HOST=your-host
export REDIS_PORT=6379
export REDIS_DB=0
export REDIS_USERNAME=default
export REDIS_PWD=your-password
export REDIS_SSL=false
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
