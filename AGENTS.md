# AGENTS.md

This file provides guidance to AI coding agents (ChatGPT, Codex, Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

A collection of agentskills.io-compliant skills for AI coding agents working with Redis. Each skill is a focused, spec-compliant directory under [skills/](skills/):

- [redis-core](skills/redis-core/) — data structures, key naming, memory/TTL, atomic primitives, JSON vs Hash, Streams vs Pub/Sub
- [redis-connections](skills/redis-connections/) — pooling, multiplexing, pipelining, client-side caching, timeouts
- [redis-search](skills/redis-search/) — FT.CREATE / FT.SEARCH / FT.AGGREGATE / FT.HYBRID, schema design, HNSW vs FLAT, hybrid retrieval, RAG
- [redis-semantic-cache](skills/redis-semantic-cache/) — LangCache for LLM response caching
- [redis-clustering](skills/redis-clustering/) — hash tags, multi-key ops, read replicas
- [redis-security](skills/redis-security/) — AUTH, TLS, ACLs, network exposure, command renaming
- [redis-observability](skills/redis-observability/) — INFO, SLOWLOG, MEMORY DOCTOR, FT.PROFILE, Redis Insight
- [add-redis-iris](skills/add-redis-iris/) — Redis Iris entry point: detects the framework, routes to a product skill
- [add-agent-memory](skills/add-agent-memory/) — Redis Iris Agent Memory: provision, recall, write-back
- [add-agent-playbooks](skills/add-agent-playbooks/) — Redis Iris Agent Playbooks: published Skills and approved FAQs
- [add-context-gateway](skills/add-context-gateway/) — Redis Iris Context Gateway: one MCP endpoint for every upstream server
- [add-intent-router](skills/add-intent-router/) — Redis Iris Intent Router: semantic routing by example phrasings

The `add-*` Iris skills are copied from [redis/redis-iris](https://github.com/redis/redis-iris/tree/main/skills), which is their source of truth; edit them there and re-copy, adding this repo's `license` and `metadata` frontmatter and turning `../<skill>/SKILL.md` links into plain skill names (the validator rejects links that leave the skill directory).

## Where Skills Live

`skills/` is the source of truth. `plugins/redis-development/skills/` holds **generated real copies** of it for the ChatGPT, Codex, Claude Code, and Cursor plugin package, committed to the repo, and `npm run sync:plugins` regenerates them. Every marketplace publishes that one plugin directory, each through its own per-plugin manifest inside `plugins/redis-development/` (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`); the Claude and Cursor listings point at it from the repo-root `.claude-plugin/marketplace.json` and `.cursor-plugin/marketplace.json`.

Copies rather than symlinks, because Claude Code and Cursor both drop a symlink that escapes the plugin root when a plugin is installed from git, so the plugin loads no skills at all. Real files also survive a Windows checkout, where git writes symlinks as plain text files unless `core.symlinks` is on.

The copies also decide *when* an update publishes. The Claude Code plugin directory fetches only the `plugins/redis-development` subdirectory, and its nightly bot advances our pinned commit only when that subdirectory's own contents change. A skill edit that never lands there is never noticed, no matter how many versions we bump.

Only what an agent loads at runtime is vendored. Eval suites are not a special case here: they live in top-level [evals/](evals/), outside any skill.

You should never have to run the sync by hand. The pre-commit hook runs it and stages the result, and `npm run validate:plugin-skills` (inside `validate:plugins`, so in both the hook and CI) fails when the copies drift, when a file lingers for a skill that no longer exists, or when a symlink reappears on either side.

## Skill Format

All skills follow the [agentskills.io specification](https://agentskills.io/specification):

```
skills/<skill-name>/
├── SKILL.md          # Required: YAML frontmatter (name, description, license, metadata) + agent-facing instructions
├── references/       # Optional: long-form content loaded on demand (one file per topic)
├── scripts/          # Optional: executable code agents may invoke
└── assets/           # Optional: static resources (templates, schemas, images)
```

Use [skills/redis-core/](skills/redis-core/) as the reference layout. Editorial convention across this repo: keep `SKILL.md` under ~150 lines with summary tables and key principles inline; move full Python/Java code samples into `references/<topic>.md` (one file per source rule). The agent loads `SKILL.md` once on activation; reference files are loaded only when the task requires them.

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with the required frontmatter:
   ```yaml
   ---
   name: <skill-name>
   description: <one paragraph that includes the trigger phrases agents should match on>
   license: MIT
   metadata:
     author: <organization>
     version: "0.1.0"
   ---
   ```
2. Add long-form examples under `references/`.
3. If the skill needs internal eval coverage, add `evals/<skill-name>/<suite-name>/{evals.json, model-matrix.json}` at the repo root, run the suite, and promote a baseline (`npm run eval:baseline`) — validation requires every suite to carry a current baseline.
4. To publish via the marketplaces:
   - ChatGPT and Codex: the sync vendors every skill into `plugins/redis-development/`; keep its `.codex-plugin/plugin.json` version aligned with the Claude manifest before submitting the package to OpenAI.
   - Claude Code: nothing to wire up. The sync vendors every skill under `skills/`, so committing runs it and the directory's nightly bot picks the change up.
   - Cursor: nothing to wire up either — the single `redis-development` plugin bundles every vendored skill. Cursor does not pull from git, so ask the Cursor marketplace team for a re-index (or re-submit at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)) once the change lands.
5. Validate: `npm run validate` (covers plugin manifests, the vendored copies, eval baselines, and the agentskills.io spec).

## Running Validators

```bash
npm run validate                   # plugin manifests + vendored copies + eval baselines + agentskills.io spec
npm run validate:eval-baselines    # every eval suite has a baseline matching its evals and matrix
npm run validate:skill-structure   # spec validation only (across all skills)
npm run validate:plugins           # codex + claude + cursor plugin manifests + vendored copies
npm run validate:codex-plugins     # Codex manifest, assets, metadata, and cross-manifest consistency
npm run validate:plugin-skills     # vendored copies match skills/, with no symlinks
npm run sync:plugins               # regenerate the vendored copies (the fix when the above fails)
```

CI runs the full `validate` on every PR. The husky pre-commit hook regenerates the
vendored copies, stages them, and runs the plugin-manifest and eval-baseline
checks — skill-structure validation needs the `skill-validator` Go binary and
network access for link checking (see CONTRIBUTING.md).

## Running Evals

```bash
# Run the eval suite for a single skill
npm run eval -- --skill <skill-name> --suite <suite-name>

# Re-aggregate an existing iteration
npm run eval:aggregate -- --skill <skill-name> --suite <suite-name>

# Promote an iteration as the committed baseline
npm run eval:baseline -- --skill <skill-name> --suite <suite-name> --iteration iteration-1
```

Eval suites live under `evals/<skill-name>/<suite-name>/`, outside `skills/`. Two reasons they are not next to the skill they exercise:

- A `with_skill` run grants the model read access to `skills/<skill-name>/` and points it there. `evals.json` carries `expected_output` and the grader's `expectations`, so keeping it inside that directory hands the model the answer to the question it is being asked.
- Everything under `skills/` is what the marketplaces publish. Nesting eval suites and baselines there ships them to every installed user.

The eval workspace output is written to `eval-workspaces/` (gitignored).
