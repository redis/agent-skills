# Integrate Playbooks with the agent

Read this when adding or checking runtime discovery, procedure loading, and proposal submission. Use the choices from the main skill.

Create the Playbook once at startup, with the environment loaded by the application's launcher. `from_env()` reads process variables, not `iris.toml` or dotenv files by itself. A working CLI profile does not configure the application's SDK:

```python
from redis_iris import AgentPlaybooks

playbook = AgentPlaybooks.from_env()
audience = None  # e.g. "support" only when the content has that attribute
propose_uncovered = False  # use the decision from the main skill
```

Create **one** of these objects with those same choices:

```python
# Progressive disclosure: the model chooses which procedure to load.
context = playbook.disclosure(audience=audience, propose_uncovered=propose_uncovered)
```

Register all three tools from `context.tools()`: `load_skill`, `read_skill_resource`, and `discover_playbook`. Adapt their `name`, `description`, JSON-schema `parameters`, and `sync`/async `call` to the framework's tool interface. Give the same tools to the model and its tool executor. Instruct the model to load a Skill using the key and version shown in the menu before following it.

```python
# Score-based hooks: the top matching procedure is loaded automatically.
context = playbook.hooks(
    audience=audience,
    propose_uncovered=propose_uncovered,
    load_skills_above=0.75,
)
```

Tune that threshold against observed scores. These hooks load one Skill's instructions; they do not register resource-loading tools. Procedures needing attached files require explicit resource reads or progressive disclosure.

For either mode, insert the context before the model and submit the accepted final answer afterward:

```python
system_prompt = f"{BASE_SYSTEM}\n\n{context.before(question)}"
# Run the existing agent with this prompt, its response policy, and its tools.
context.after(question, answer)
```

Build from the base prompt afresh each turn to avoid accumulating old content. Async equivalents are `abefore` and `aafter`.

Preserve the application's response/authorization rules in `BASE_SYSTEM` and its acceptance path. Define how it asks for clarification or escalates insufficient content. Playbook failures raise by default; implement the agreed outage behavior using the application's existing error handling. Use the SDK's optional `fail_open` only when continuing without Playbook guidance fits that policy.

| Framework | Placement |
|---|---|
| LangGraph | `attach(context, graph)` from `redis_iris.integrations.langgraph`, before `compile()`. For disclosure, add `langchain_tools(context)` to both `bind_tools` and `ToolNode`. Use `answer_from=` if the accepted answer lives outside the last message. |
| Google ADK | `attach(context, agent)` from `redis_iris.integrations.adk`. Register adapted disclosure tools separately. |
| OpenAI Agents SDK | Add context through dynamic `instructions`; call `after` on the final answer after `Runner.run`. |
| Pydantic AI | Add context through a dynamic system prompt; call `after` after `agent.run`. |
| CrewAI | Add context to task/agent inputs before execution; use the final accepted task output for `after`. |
| Plain loop | Assemble context before the model call; call `after` after the final answer. |

Use the configured `context` object throughout. Passing `playbook` to `attach` constructs fresh default hooks and loses the choices above.

`propose_uncovered=True` files the final answer unchanged as an FAQ proposal only when discovery is empty and neither truncation flag is set. It has no source or evidence. If submission needs a judge, normalization, provenance, or evidence, leave automatic proposals off and call `playbook.propose_faq(...)` behind the application's existing gate. An identical candidate resolves to an existing proposal; a different answer can create another.

For direct retrieval, custom filters, version-frozen turns, FAQ/Skill proposal APIs, and package submission, inspect the installed `redis_iris.agent_playbooks` source. If sessions are also recorded in Agent Memory, read [memory extraction](memory-extraction.md) before enabling a second proposal path.
