# Author and publish content

Read this when creating or maintaining FAQ and Skill files. Use the choices from the main skill.

Derive content from the project's approved sources. Use only the content types selected in the main skill:

```text
skills/refund-intake/SKILL.md
skills/refund-intake/.iris-playbook.json  # optional intents, attributes, metadata
faqs/refunds/request.json
```

A Skill directory's name must match its frontmatter `name`:

```markdown
---
name: refund-intake
description: Collect the details support needs to review a refund request.
---
1. Collect the order ID and purchase date.
2. Ask for the reason for the refund request.
3. Summarize those details for the reviewer. Confirm eligibility only from published policy.
```

For procedures that call tools, name the application's actual registered tools, required inputs, authorization conditions, failure handling, and completion criteria. A reference to another Skill must have a corresponding published procedure and a way to load it.

An FAQ file contains:

```json
{
  "entryKey": "refund-request",
  "question": "How do I request a refund?",
  "answer": "Provide the order ID, purchase date, and reason to the support team."
}
```

With multiple audiences, add `"attributes": {"audience": "support"}` to each relevant FAQ and the same attributes in `.iris-playbook.json` beside each relevant Skill. Discovery filters match attributes exactly; unlabeled entries will not match an audience filter.

Before publishing, check this small baseline:

| Content | Quality check |
|---|---|
| FAQ | The question reflects a real user ask; the answer comes from an identified approved source and applies to the intended audience. |
| Skill | The description says when it applies; instructions name required inputs, real tools when used, failure/authorization conditions, and a clear completion or handoff. |
| Matching | Record a representative question, a paraphrase, and the expected key; use optional `intents` for useful alternate phrasings. Validate relevance in the application walkthrough. |

With the content environment loaded, validate and preview only directories you created. Every `iris` command uses root options `--json --no-input`:

```bash
iris --json --no-input agent-playbooks skills validate ./skills
iris --json --no-input agent-playbooks skills plan ./skills --publish changed
iris --json --no-input agent-playbooks skills sync ./skills --publish changed
iris --json --no-input agent-playbooks faqs validate ./faqs
iris --json --no-input agent-playbooks faqs plan ./faqs --publish changed
iris --json --no-input agent-playbooks faqs sync ./faqs --publish changed
```

`sync` without publication creates or updates drafts. `--publish changed` (also bare `--publish`) publishes entries created or changed by that sync; it leaves identical drafts unpublished. To serve an existing draft, publish its reviewed version explicitly with `skills publish KEY --version N` or `faqs publish KEY --version N`. Use `sync --publish all` only when every matching latest version is intended for publication.

Include the content files in the project's change. Authoring and lifecycle details: `iris agent-playbooks skills --help` and `iris agent-playbooks faqs --help`.

## Maintain the content

Identify the existing content owner and publisher. For the next approved update,
edit the source file, then repeat the relevant validate/plan/sync commands above
with the content credential. Inspect the plan before publication. An approved
change appends a version; an identical draft still needs explicit publication.

Find the serving version in the published inventory for the relevant type, then
read that exact version (`N`) with `show`:

```bash
iris --json --no-input agent-playbooks faqs list --published
iris --json --no-input agent-playbooks faqs show ENTRY_KEY --version N
iris --json --no-input agent-playbooks skills list --published
iris --json --no-input agent-playbooks skills show ENTRY_KEY --version N
```

`show` without `--version` reads the latest version, which can be an unpublished
draft. An entry can have an older serving version and a newer draft at once.

Rerun the same application question and confirm the new version is used. In a
development Playbook, this makes a useful first maintenance exercise; keep
production publication within the requested work. Include the file and exact
update/verification commands in the handoff. Preserve an existing CI publisher
and its separate credential rather than inventing a second publishing process.
