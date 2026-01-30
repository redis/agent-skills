# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

A collection of skills for AI coding agents working with Redis. Skills are packaged instructions and resources that extend agent capabilities.

## Creating a New Skill

### Directory Structure

```
skills/
  {skill-name}/               # kebab-case directory name
    SKILL.md                  # Required: skill definition with frontmatter
    AGENTS.md                 # Generated: compiled rules (for rule-based skills)
    README.md                 # Required: user documentation
    metadata.json             # Required: version and metadata
    rules/                    # For rule-based skills
      _sections.md            # Section definitions
      _template.md            # Rule template
      {prefix}-{name}.md      # Individual rules
    scripts/                  # For script-based skills (optional)
      {script-name}.sh
```

### Naming Conventions

- **Skill directory**: `kebab-case` (e.g., `redis-best-practices`, `redis-monitoring`)
- **SKILL.md, AGENTS.md**: Always uppercase
- **Rule files**: `{prefix}-{description}.md` where prefix maps to section
- **Scripts**: `kebab-case.sh`

### SKILL.md Format

```markdown
---
name: {skill-name}
description: {One sentence describing when to use this skill. Include trigger phrases.}
license: MIT
metadata:
  author: {organization}
  version: "1.0.0"
---

# {Skill Title}

{Brief description of what the skill does.}

## When to Apply

Reference these guidelines when:
- {Use case 1}
- {Use case 2}

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | {Category} | HIGH | `{prefix}-` |

## Quick Reference

### 1. {Category} (HIGH)

- `{prefix}-{rule-name}` - {Brief description}

## How to Use

{Instructions for reading individual rules}

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
```

### Rule File Format

Each rule in `rules/` follows this structure:

```markdown
---
title: Clear, Action-Oriented Title
impact: HIGH|MEDIUM|LOW
impactDescription: Quantified benefit (e.g., "10x faster")
tags: relevant, keywords
---

## {Title}

{1-2 sentence explanation of the problem and why it matters}

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

### Adding a New Skill

1. Create skill directory: `skills/{skill-name}/`
2. Create `SKILL.md` with frontmatter and structure above
3. Create `metadata.json`:
   ```json
   {
     "version": "1.0.0",
     "organization": "Your Org",
     "date": "Month Year",
     "abstract": "Description for AI agents",
     "references": ["https://..."]
   }
   ```
4. Create `README.md` with user documentation
5. For rule-based skills:
   - Create `rules/_sections.md` defining categories
   - Create `rules/_template.md` for contributors
   - Add rules as `rules/{prefix}-{name}.md`
   - Add skill config to `packages/redis-best-practices-build/src/config.ts`
   - Run `npm run build` to generate AGENTS.md

### Build System

The build tooling in `packages/redis-best-practices-build/` compiles individual rule files into AGENTS.md:

```bash
cd packages/redis-best-practices-build
npm install
npm run validate  # Check rule structure
npm run build     # Generate AGENTS.md
```

To add a new skill to the build system, update `src/config.ts`:

```typescript
export const SKILLS: Record<string, SkillConfig> = {
  'your-new-skill': {
    name: 'your-new-skill',
    title: 'Your New Skill',
    description: 'Description',
    skillDir: join(SKILLS_DIR, 'your-new-skill'),
    rulesDir: join(SKILLS_DIR, 'your-new-skill/rules'),
    metadataFile: join(SKILLS_DIR, 'your-new-skill/metadata.json'),
    outputFile: join(SKILLS_DIR, 'your-new-skill/AGENTS.md'),
    sectionMap: {
      prefix1: 1,
      prefix2: 2,
    },
  },
}
```

### Best Practices for Context Efficiency

- **Keep SKILL.md under 500 lines** — put detailed rules in separate files
- **Write specific descriptions** — helps agents know when to activate the skill
- **Use progressive disclosure** — SKILL.md summarizes, AGENTS.md has full details
- **Quantify impact** — "10x faster" helps agents prioritize rules

### End-User Installation

**Claude Code:**
```bash
cp -r skills/{skill-name} ~/.claude/skills/
```

**Claude.ai:**
Add SKILL.md to project knowledge or paste contents into conversation.
