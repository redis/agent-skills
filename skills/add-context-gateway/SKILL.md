---
name: add-context-gateway
description: Put the MCP servers an existing agent uses behind one Redis Iris Context Gateway with redis-iris, so the agent connects to one MCP endpoint with one agent key instead of configuring each server and its secret. Asks five questions (which MCP servers and secrets the agent has today, how many tools it sees, which read-only tools may be cached, which tools return large results, whether the framework speaks MCP itself), provisions the Gateway and its Upstreams from the terminal with `iris context-gateway`, sets cache and compression policies, then points the agent at the Gateway in any framework. Use when the agent configures several MCP servers one by one, carries one secret per server, loads too many tool schemas into the prompt, or the user asks for Context Gateway, one MCP endpoint, tool caching, or result handles.
license: MIT
metadata:
  author: redis
  version: "1.0.0"
---

# Add Context Gateway

One MCP endpoint and one agent key in place of every MCP server the agent configures today. The Gateway holds each Upstream's secret, namespaces tool names so they never collide, can expose a large catalog as `search_tools` and `run_tool` instead of every schema, caches read-only tools you opt in, and can hand a large result back as a handle. The agent keeps its tools; only where it reaches them changes. Ask first, provision, then repoint.

## 1. Discover

Read the project:

- Find every MCP server the agent configures: `.mcp.json`, `.cursor/mcp.json`, `McpToolset`, `MCPServerStreamableHttp`, `MultiServerMCPClient`, `stdio_client`, or a hand-written MCP client. Note each endpoint and where its secret comes from.
- Find where tools are handed to the model and where the turn runs.
- Identify the framework from imports, and whether it has its own MCP client.
- Note stdio-only servers: an Upstream is an HTTP MCP endpoint (`streamable-http`). A stdio server has to be served over HTTP first, or stays outside the Gateway.

Then ask the developer these five questions, nothing more. A shrug takes the default.

| Ask | If the answer is | Configure |
|---|---|---|
| Which MCP servers does the agent use, and where do their secrets live? | A list of HTTP endpoints | One Upstream each: `upstream add --name NAME --endpoint URL` with `--bearer-secret env:VAR` or `--header NAME --header-secret env:VAR` |
| | A Redis database the agent should query | A Context Surface Upstream: `--kind context-surface --surface-database-id ID --data-model FILE` (on-prem the ID can be left out and defaults from the deployment config, and cloud requires it) |
| How many tools does the agent see in total? | Tens (default) | `--tool-exposure-mode full`: every tool, namespaced |
| | Hundreds, or schemas crowd the prompt | `--tool-exposure-mode search`: the model sees `search_tools` and `run_tool` |
| Which read-only tools return the same answer for the same arguments? | Lookups, searches, reference data | `policy set UPSTREAM TOOL --cache-ttl SECONDS` per tool; `--database-id ID` on the Gateway for the cache |
| | None, or not sure | No cache policies |
| Which tools return results too large to read whole? | Exports, list endpoints, logs | Leave them to the deployment's handle defaults, or `--compression-ttl SECONDS` per tool; `--compression-capture never` for a tool that must always return whole |
| Does the framework connect to MCP servers itself? | Yes: Claude Code, Cursor, ADK, OpenAI Agents SDK, LangChain MCP adapters | Point its MCP client at the Gateway URL and key |
| | No, or the agent wants plain function tools | The SDK: `gateway.model_tools()` or `gateway.hooks()` |

## 2. Get current facts from MCP

Do this before writing code. Never guess framework APIs from memory.

- Framework docs: query an available docs MCP (Context7, or the framework's own) for the installed version's MCP client: how it takes a streamable HTTP URL and an `Authorization` header.
- Redis docs: if the Redis docs MCP is connected, use it for Context Gateway concepts (Upstreams, exposure modes, cache, handles).
- No MCP available: read the installed package source in the virtualenv. Say so in the report.

## 3. Provision

Context Gateway is self-managed for now: a `cloud` profile refuses the control-plane commands with `cloud_unsupported`. Add `--local` for the local Compose stack, or let the person export `IRIS_CONTEXT_GATEWAY_SERVICE_URL`, `IRIS_CONTEXT_GATEWAY_SERVICE_TOKEN`, `IRIS_IDENTITY_URL` and `IRIS_IDENTITY_TOKEN` ([Provision without the UI](https://github.com/redis/redis-iris/blob/main/docs/user_guides/provision-without-the-ui.md)).

```
iris --json --no-input context-gateway service list
iris --json --no-input context-gateway service create --name support --tool-exposure-mode full --write-env .env
iris --json --no-input context-gateway service check <gatewayId from the result>
```

Add `--database-id ID` to `create` when question 3 named tools to cache: the cache needs a Gateway database, an ID from the deployment's `databases:` registry (on-prem it defaults from the deployment config, and cloud requires it). Without one, every call bypasses the cache (`service update GATEWAY_ID --database-id ID` adds it later).

### Run the CLI as an agent

1. Always put `--json --no-input` before the product name. You get one JSON value on stdout, errors as one JSON value on stderr, and no prompts.
2. Read before you write. `service create` has no `--dry-run`, so run `service list` first: it proves the service URL and token, and a `credential_required` or `configuration_error` there means hand off (step 4) before anything is created.
3. Always deliver keys with `--write-env PATH` (or `--write PATH` on `service key`). Never run `create` or `key` with `--json` and no file: that prints the key into your transcript.
4. On `credential_required`, stop. Tell the person which variable to set (`details.env`) and link `details.obtain`. Never ask for a secret in chat, pass one on the command line, or echo, `cat` or `grep` an env file.
5. Upstream secrets go in by reference only: `env:NAME`, `file:PATH` or `-`. Ask the person to export the variable; never write the secret yourself.
6. On `resource_exists`, ask whether to `--reuse` `details.gatewayId` or pick another name. Never delete to retry. If `create` fails with `details.created: true`, re-run with `--reuse --write-env`.

[Provision without the UI](https://github.com/redis/redis-iris/blob/main/docs/user_guides/provision-without-the-ui.md#hand-back-to-a-person) maps every error code to the person's action.

`--write-env .env` writes `IRIS_CONTEXT_GATEWAY_URL` (the Gateway's MCP endpoint), `IRIS_CONTEXT_GATEWAY_ID` and `IRIS_CONTEXT_GATEWAY_API_KEY`. Add the same three names to `.env.example` with empty values. Never commit `.env`.

Add the Upstreams (question 1). `IRIS_CONTEXT_GATEWAY_ID` is not a secret; pass `--gateway-id` with the `gatewayId` `create` printed (`gw_` and 32 hex characters) rather than sourcing `.env`:

```
iris --json --no-input context-gateway --gateway-id GATEWAY_ID upstream add --name CRM --endpoint https://crm.example.com/mcp --bearer-secret env:CRM_TOKEN
iris --json --no-input context-gateway --gateway-id GATEWAY_ID upstream add --name Tickets --endpoint https://tickets.example.com/mcp --header X-Api-Key --header-secret env:TICKETS_KEY
iris --json --no-input context-gateway --gateway-id GATEWAY_ID upstream tools crm
```

An `upstream add` that prints `initialCatalogFailure` still created the Upstream: 422 means the Upstream refused the credentials (fix with `upstream update`, then `upstream refresh`), 424 means discovery failed (check the control plane can reach the endpoint), 408 means it timed out.

Set policies (questions 3 and 4). `upstream tools` says which tools are cacheable; only those take `--cache-ttl`:

```
iris --json --no-input context-gateway --gateway-id GATEWAY_ID policy set crm search_customers --cache-ttl 300
iris --json --no-input context-gateway --gateway-id GATEWAY_ID policy set crm export_orders --compression-ttl 3600
```

Full reference: [Context Gateway CLI](https://github.com/redis/redis-iris/blob/main/docs/user_guides/context-gateway-cli.md).

## 4. Repoint the agent

**MCP-native frameworks** (question 5, yes). Replace each server entry with one Gateway entry. `connect` writes it with the key read from a variable at run time, never printed:

```
iris context-gateway --gateway-id GATEWAY_ID connect --client claude-code --write .mcp.json
iris context-gateway --gateway-id GATEWAY_ID connect --client cursor --write .cursor/mcp.json
iris context-gateway --gateway-id GATEWAY_ID connect --client adk > gateway_tools.py
iris context-gateway --gateway-id GATEWAY_ID connect --client json
```

For another MCP client (OpenAI Agents SDK, LangChain MCP adapters), use the `json` output: the URL, `streamable-http`, and an `Authorization: Bearer` header with the value of `IRIS_CONTEXT_GATEWAY_API_KEY`. Confirm the client's parameter names in step 2. A `.env` file doesn't reach a running client: the variable must be in the environment the client starts in.

**SDK tools** (question 5, no):

```python
from redis_iris import ContextGateway

gateway = ContextGateway.from_env()
tools = gateway.model_tools()  # framework-free Tool objects, one per Gateway tool
```

On LangGraph, `langchain_tools(gateway.hooks())` from `redis_iris.integrations.langgraph` gives LangChain tools for a `ToolNode`. With Agent Memory or Agent Playbooks also wired, stack them so the model gets every product's tools from one place:

```python
from redis_iris.hooks import stack
from redis_iris.integrations.langgraph import attach, langchain_tools

hooks = stack(memory.hooks(), playbook.disclosure(), gateway.hooks())
graph.add_node("tools", ToolNode(langchain_tools(hooks)))
app = attach(hooks, graph).compile()
```

`gateway.call("crm.lookup_customer", id="cust-1042")` calls a tool directly (`result.data`, `result.is_error`), and `gateway.call_as_handle(...)` keeps a large result on the Gateway as a `Handle` (`page()`, `query()`, `count()`, `aggregate()`, `release()`). Async twins: `atools`, `acall` and so on.

Then remove what the Gateway replaced: each per-server MCP entry, each per-server secret from the agent's environment (the Gateway holds them now), and any hand-written namespacing or tool filtering.

Tool names change to `namespace.tool`, for example `crm.lookup_customer`. Update any prompt text or code that names a tool.

## 5. Verify

1. `iris context-gateway service check GATEWAY_ID` passes every step: token, Gateway, Identity Service, agent key, and one `tools/list` with the agent key.
2. `iris context-gateway --gateway-id GATEWAY_ID tools list` shows every Upstream's tools namespaced (full mode), or `search_tools` and `run_tool` (search mode).
3. `iris context-gateway --gateway-id GATEWAY_ID tools call crm.lookup_customer --arg id=42` returns what the server returned directly.
4. `iris context-gateway --gateway-id GATEWAY_ID policy list crm` shows the cache and compression policies from questions 3 and 4.
5. Run the agent once on a task that uses a Gateway tool, and show the call went through the Gateway (the namespaced name in the trace or log).
6. Unset `IRIS_CONTEXT_GATEWAY_API_KEY` and confirm the SDK raises `ConfigurationError` naming it, or the MCP client reports an auth failure.

`iris context-gateway service diagnose GATEWAY_ID` explains a failing Upstream, cache or handle setup.

## 6. Report

List the five answers, each Upstream added (name, namespace, endpoint, secret variable name, never the value), the exposure mode, each policy set, files changed, the client configuration written, env vars added and removed, verification output, and anything you could not confirm over MCP.
