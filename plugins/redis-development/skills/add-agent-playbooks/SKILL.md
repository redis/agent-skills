---
name: add-agent-playbooks
description: Wire Redis Iris Agent Playbooks into an existing agent with redis-iris so it follows published procedures (Skills) and answers from approved content (FAQs) instead of improvising. Asks five questions (which procedures it re-derives every turn, what it must say only from approved content, who it answers for, whether uncovered answers are filed for review, where the content lives today), writes the answers to playbook.yaml plus skills/ and faqs/ directories, provisions the service from the terminal with `iris agent-playbooks service create`, publishes with `iris agent-playbooks skills|faqs sync --publish`, then wires retrieval and write-back into the agent's turn in any framework. Use when procedures or policy are hardcoded in the prompt, retrieved from a vector store over docs, or the user asks for approved answers, FAQs, Skills, or procedures.
license: MIT
metadata:
  author: redis
  version: "1.0.0"
---

# Add Agent Playbooks

Before the model: the published answers for the question, plus the full procedure of the best matching Skill. After the turn: file the agent's own answer for review when nothing covered it. A procedure the model re-derives every turn costs reasoning tokens and drifts; a published Skill is written once, versioned, and loaded only when it matches (discovery returns compact previews under a token budget; the full SKILL.md is fetched only for the matching Skill). What the agent may say is content, not an SDK argument: ask first, provision, publish, then wire.

## 1. Discover

Read the project:

- Find the turn (where the model is called) and the user's question in scope there.
- Identify the framework from imports.
- Find existing procedure and policy sources: step lists or policy text in the prompt, a retriever tool (`create_retriever_tool`, vector store), a docs folder. You will move the content and replace the reads, not the graph.
- Tool usage guidance in the prompt (when to call a tool, which inputs to collect, which defaults to assume, how to present the result) is a Skill candidate: the tool stays, its procedure moves to `SKILL.md` and loads only when the question matches.
- A semantic response cache (model answers stored and re-served to later users) is a source too. See "Replacing a response cache" in step 4.
- Async agent? Use the `a`-prefixed methods.

Then ask the developer these five questions, nothing more. A shrug takes the default.

| Ask | If the answer is | Configure |
|---|---|---|
| Which procedures does the agent work out from scratch every time? | Multi-step tasks it repeats: intake, refund, escalation, triage | One Skill each: `skills/<name>/SKILL.md` with `name` and `description` frontmatter and step-by-step instructions. The main win |
| | None | Skip `skills/` |
| What must it say only from approved content? | Policy, pricing, legal, eligibility | One FAQ each: `faqs/<group>/<key>.json` with `entryKey`, `question`, `answer` |
| | Nothing | Skip `faqs/` |
| Who is it answering for? | One audience (default) | Nothing: no `audience` attribute, no filter |
| | Several: support, sales, internal | `"attributes": {"audience": "support"}` in each FAQ; the same in `.iris-playbook.json` beside each `SKILL.md`; the agent passes `audience=` |
| When nothing published covers a question, should the agent's own answer be filed for review? | No (default) | `propose_uncovered=False` |
| | Yes | `propose_uncovered=True`; `propose` in `key_actions` |
| Where does this content live today? | Prompt text, a docs folder, a vector store | Convert into `faqs/` and `skills/`, commit them, sync with the CLI, remove the old source |

## 2. Get current facts from MCP

Do this before writing code. Never guess framework APIs from memory.

- Framework docs: query an available docs MCP (Context7, or the framework's own docs MCP such as LangChain's) for the installed version's dynamic system prompt or instructions and before/after model callbacks.
- Redis docs: if the Redis docs MCP is connected, use `search` / `fetch` / `ask` for Playbook concepts (FAQs, Skills, discovery, publication, proposals).
- No MCP available: read the installed package source in the virtualenv. Say so in the report.

## 3. Configure

Write `playbook.yaml` from the answers. Commit it: it is the reviewable record of the service.

```yaml
name: support-playbook
embedding: {provider: openai, model: text-embedding-3-small, dimensions: 1536}   # create-only; --local uses noop/384
discovery: {faq_min_score: 0.3, skill_min_score: 0.3, max_results: 10}   # calibrate against your own scores
key_actions: [read, propose]   # propose only when question 4 was yes
```

Provision from the terminal on a self-managed suite: add `--local` for the local on-prem stack, or let the person put `IRIS_AGENT_PLAYBOOKS_SERVICE_TOKEN` and `IRIS_AGENT_PLAYBOOKS_IDENTITY_TOKEN` in `.env.admin` and source it ([Provision without the UI](https://github.com/redis/redis-iris/blob/main/docs/user_guides/provision-without-the-ui.md)). On Redis Cloud the service commands return `cloud_unsupported` with the console steps: the person creates the Playbook in **Iris → Agent Playbooks**, copies its Agent endpoint and Playbook ID from the **Settings** tab, creates a key in **Access & Identity** (**Settings → Manage API keys**), and pastes them into `.env`. Start the project's `iris.toml` and env files from [examples/project_setup](https://github.com/redis/redis-iris/tree/main/examples/project_setup) (`cloud/` or `onprem/`).

```
iris --json --no-input agent-playbooks service create --from playbook.yaml --dry-run
iris --json --no-input agent-playbooks service create --from playbook.yaml --write-env .env
iris --json --no-input agent-playbooks service check <playbookId from the result> --env-file .env
```

### Run the CLI as an agent

Every `iris` call you make follows the same loop:

1. Always put `--json --no-input` before the product name. You get one JSON value on stdout, errors as one JSON value on stderr, and no prompts.
2. Dry-run first: `service create ... --dry-run` sends nothing and lists in `missing` every credential or URL the real run needs. If `missing` is not empty, stop and hand off (step 4) before any write. Report anything in `warnings` (a grant with no tenant, or the service token standing in for the Identity Service token) to the person before the real run.
3. Always deliver keys with `--write-env PATH` (or `--write PATH` on `key`). Never run `create` or `key` with `--json` and no file: that prints the key on stdout and into your transcript.
4. On `credential_required`, stop. Tell the person which variable to set (`details.env`), for which product and profile, and link `details.obtain`. On `unauthenticated` or `forbidden`, say which value was refused (`details.source`). Never ask for the secret in chat, pass it on the command line, or echo, `cat` or `grep` an env file.
5. After provisioning, run `service check ID --env-file .env` (the file `create` wrote; the key stays out of your shell) and report each step. On failure, report the failing hop (`details.hop`, `details.step`, `details.cause`), not a guess.
6. On `resource_exists`, ask the person whether to `--reuse` `details.id` or pick another name. Never delete to retry. If `create` fails with `details.created: true`, the resource exists but has no key yet: re-run with `--reuse --write-env`.

[Provision without the UI](https://github.com/redis/redis-iris/blob/main/docs/user_guides/provision-without-the-ui.md#hand-back-to-a-person) maps every error code to the person's action.

The same settings are flags when there is no file: `--name`, `--embedding-provider openai|noop`, `--embedding-model`, `--embedding-dimensions`, `--faq-min-score`, `--skill-min-score`, `--max-results`, `--key-actions read,propose`.

`--write-env .env` writes `IRIS_AGENT_PLAYBOOKS_URL`, `IRIS_AGENT_PLAYBOOKS_PLAYBOOK_ID`, `IRIS_AGENT_PLAYBOOKS_API_KEY`. Add the same three names to `.env.example` with empty values. Never commit `.env`. Later: `iris agent-playbooks service list | show PLAYBOOK_ID | env PLAYBOOK_ID [--write PATH]` (add `--local` for a local stack).

Two keys, never one:

| Key | Actions | Mint |
|---|---|---|
| Agent (in `.env`) | `read`, plus `propose` for question 4 | `key_actions` in `playbook.yaml` |
| Content team or CI | `read,write,publish` | `iris agent-playbooks service key $IRIS_AGENT_PLAYBOOKS_PLAYBOOK_ID --role content --write .env.content`. It writes `IRIS_AGENT_PLAYBOOKS_CONTENT_API_KEY`, which the CLI prefers for `sync` and `publish`; load it only in the shell that runs them, never in the agent's `.env` |

Author the content (questions 1, 2, 3, 5). Directory name must equal the Skill's `name`:

```text
skills/refund-intake/SKILL.md             # question 1
skills/refund-intake/.iris-playbook.json  # optional: {"intents": [...], "attributes": {"audience": "support"}}
faqs/billing/overdraft-fee.json           # question 2
```

```markdown
---
name: refund-intake
description: Collect what a refund request needs before deciding it.
---
1. Confirm the order id and purchase date.
2. Ask for the reason; map it to one refund category.
3. Hand off to the refund-decision Skill with the category and amount.
```

```json
{
  "entryKey": "overdraft-fee",
  "question": "Why was I charged an overdraft fee?",
  "answer": "A $35 fee applies when ...",
  "intents": ["why did I get an overdraft fee"],
  "attributes": {"audience": "support"}
}
```

Validate locally, preview, publish (with the content key in the shell):

```
iris agent-playbooks skills validate ./skills && iris agent-playbooks skills plan ./skills
iris agent-playbooks faqs validate ./faqs && iris agent-playbooks faqs plan ./faqs
iris agent-playbooks skills sync ./skills --publish
iris agent-playbooks faqs sync ./faqs --publish
```

Bare `--publish` means `changed`; `sync` without it creates drafts that discovery will not return. Commit `skills/` and `faqs/`. Remove the old source (question 5). Full authoring reference: [Agent Playbooks CLI](https://github.com/redis/redis-iris/blob/main/docs/user_guides/agent-playbooks-cli.md).

Create once at startup:

```python
from redis_iris import AgentPlaybooks

playbook = AgentPlaybooks.from_env()
hooks = playbook.hooks(
    audience="support", load_skills_above=0.75, propose_uncovered=False
)  # questions 3, 4
```

Drop `audience=` when question 3 was one audience. Tune `load_skills_above` on observed scores: the Skill's full procedure is appended only when its score reaches it.

## 4. Wire the two seams

Before the model (context in):

```python
system_prompt = f"{system_prompt}\n\n{hooks.before(question)}"  # await hooks.abefore(...)
```

Published answers with keys and versions; the best matching Skill's full procedure appended when its score >= `load_skills_above`.

After the turn (write-back):

```python
hooks.after(question, answer)  # await hooks.aafter(...)
```

With `propose_uncovered=True`, files the answer unchanged as an FAQ proposal when discovery returned nothing and was not cut by the budget; an identical candidate (same key, question and answer) resolves to the existing proposal, a different answer files another. Keep the call when question 4 was no: turning proposals on is then a one-argument change.

Prefer progressive disclosure when the framework takes tools: `disclosure = playbook.disclosure(audience=...)`; `disclosure.before(question)` is the menu for the prompt, `disclosure.tools()` (or `langchain_tools(disclosure)`) gives the model `load_skill`, `read_skill_resource` and `discover_playbook`, and `attach(disclosure, graph)` places the two seams. The model decides which Skill to load; nothing is pre-loaded by score.

Explicit alternative: `playbook.discover(question, audience=..., limit=5)` returns a `Discovery` (`.as_prompt()`, `.best_faq`, `.best_skill`, `.truncated`); `playbook.skill(entry)` returns the Skill in full (`.instructions`, `.resources`, `.as_prompt()`); `playbook.propose_faq(key=, question=, answer=)`. Other filters: `filter_=eq("locale", "en-US")` from `redis_iris.agent_playbooks`. Anything else: `playbook.client`.

Every row is the same two calls, with nothing framework-specific. Where they go (confirm names in step 2):

| Framework | Before model | After turn |
|---|---|---|
| LangGraph (StateGraph) | `attach(playbook, graph, audience="support")` from `redis_iris.integrations.langgraph` (extra `redis-iris[langgraph]`) inserts both calls around the user's nodes before `compile()`. Hand-wired alternative: a node before the model | included in `attach`; else a node after the model |
| OpenAI Agents SDK | dynamic `instructions` callable | after `Runner.run` returns |
| Google ADK (`LlmAgent`) | `attach(playbook, agent)` from `redis_iris.integrations.adk` (no extra) adds both model callbacks ahead of the agent's own | included in `attach` |
| Pydantic AI | dynamic `@agent.system_prompt` | after `agent.run` returns |
| CrewAI | inject into the task or agent inputs before `kickoff` | `task_callback` |
| Plain loop | before the model call | after the model call |

Retrieval-as-a-tool graphs that must keep the tool: change its body to `playbook.discover(query, audience=...).as_prompt()`, or replace it with `disclosure.tools()`, which already includes `discover_playbook`.

Remove the replaced prompt text, retriever, vector store and its embedding pipeline. Playbook embeds on publish.

### Replacing a response cache

Published FAQs take over the cache's job, with a review step in between.

- **Lookup becomes discovery.** `playbook.discover(question)` replaces the cache check. Serve `found.best_faq.faq.answer` directly only when `best_faq.score` clears a threshold you tune on real scores and the turn is generic: not about this user, not a correction. A score selects guidance; it does not certify the answer for every request. Below the threshold, the menu goes in the prompt and the model answers, loading a Skill if it decides to.
- **Store becomes propose.** Where the cache stored the answer, call `playbook.propose_faq(key=..., question=..., answer=...)`. Keep any judge that already decides what is shareable; it is the privacy boundary. An identical candidate (same key, question and answer) resolves to the existing proposal, and nothing is served until a person accepts and publishes it. The agent key needs `propose`.
- **Eviction becomes withdrawal.** Proposals create new FAQs only. A correction files a proposal with the corrected answer; an operator withdraws or rolls back the published version (`iris agent-playbooks faqs withdraw <key>`, `faqs publish <key> --version N`).
- **Remove the cache client, its settings, and the normaliser and judge calls that fed it.** Keep the generic-turn check.

### Connecting Agent Memory as an extraction source

If the agent also records sessions in Agent Memory, Playbook can file FAQ proposals from them in the background instead of the agent proposing after every answer. The deployment must run the extraction worker and have the Playbook service connected to the Memory Identity Service; then one binding per store:

```bash
iris --json --no-input agent-playbooks extraction bind "$IRIS_AGENT_MEMORY_STORE_ID" --playbook-id PLAYBOOK_ID --enable
```

It takes the service token (`IRIS_AGENT_PLAYBOOKS_SERVICE_TOKEN`) and needs the Playbook id, from `--playbook-id` or `IRIS_AGENT_PLAYBOOKS_PLAYBOOK_ID`; without either it fails with `configuration_error`. Pass `--playbook-id` explicitly with the id `create` printed (it is also the `IRIS_AGENT_PLAYBOOKS_PLAYBOOK_ID` line in `.env`, and is not a secret), rather than sourcing `.env` into the shell, which would load the agent key too. The Playbook service checks the store before it creates the binding, so a wrong store id, or a store another account owns, fails here with `forbidden`; a binding it accepts is `READY`, and `--enable` turns it on in the same call. The idle window defaults to 60 seconds (`--idle-seconds` to change it).

Sessions idle for the window are read on the worker's next scan (the deployment sets how often); each question and answer pair becomes a proposal whose `source` names the session and events. Once those proposals are judged good enough, the agent's own `propose_faq` call becomes optional; until then the same question files twice. A binding that later shows `BLOCKED` names its reason (`source_not_found`, `source_access_denied`, or another); fix the store, then run `extraction enable BINDING_ID`, which checks it again.

## 5. Verify

1. `iris agent-playbooks service show PLAYBOOK_ID` echoes the embedding and discovery thresholds from `playbook.yaml`. Key actions are not on the Playbook record; they live on the Identity Service grant, so `iris agent-playbooks service check PLAYBOOK_ID --env-file .env` shows them in its `agent key` step (`grants read,propose on ...`).
2. `iris agent-playbooks skills list` and `iris agent-playbooks faqs list --published` show every synced entry as published.
3. `iris agent-playbooks discover "<question a Skill covers>"` returns that Skill first.
4. Run the agent once with that question. Show `hooks.before("<question>")` contains the Skill's steps and the FAQ keys with versions, and that it reached the model's prompt.
5. Question 4 was yes: ask something nothing covers; `iris agent-playbooks proposals list --view inbox` shows one proposal. Ask again: still one.
6. Unset a variable and confirm `ConfigurationError` names it (raised on first call).

Empty discovery means nothing is published for that question, not a wiring bug: check `faqs show <key>` / `skills show <name>` for drafts and re-run `sync --publish`.

## 6. Report

List the five answers and the `playbook.yaml`, `skills/` and `faqs/` entries each produced, files changed, env vars added, keys minted and their actions, where each seam went, the `load_skills_above` chosen, verification output, and anything you could not confirm over MCP.
