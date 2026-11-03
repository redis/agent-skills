# Connect or provision a Playbook

Read this when the application needs Playbook connection settings or a new service. Reuse an existing Playbook when supplied. Start the project's `iris.toml`. Only the `iris` CLI reads `iris.toml`; the app reads env vars. It holds URLs only: a token in TOML makes the CLI exit 2. Select the profile with `IRIS_CONFIG=./iris.toml` and `IRIS_PROFILE=cloud` or `IRIS_PROFILE=suite`.

Redis Cloud. The person fills `.env` from the console: `IRIS_AGENT_PLAYBOOKS_URL` (the Agent endpoint), `IRIS_AGENT_PLAYBOOKS_PLAYBOOK_ID` and `IRIS_AGENT_PLAYBOOKS_API_KEY`.

```toml
[profiles.cloud]
kind = "cloud"
console_url = "https://cloud.redis.io"

[profiles.cloud.agent_playbooks]
url = "https://playbook.example.com"  # the data-plane URL from the console
```

Self-managed suite. The operator's tokens go in `.env.admin`, never the app's `.env`; `service create --write-env .env` writes the app's `.env`.

```toml
[profiles.suite]
kind = "self-managed"

[profiles.suite.agent_playbooks]
service_url = "https://playbook-admin.example.com"  # control plane: the CLI calls it for service create and check
url = "https://playbook.example.com"  # data plane: what the agent calls
identity_url = "https://playbook-identity.example.com"  # Identity Service that mints the agent's keys
```

A suite with one shared Identity Service sets `[profiles.suite.identity]` `url` once instead of each `identity_url`. `IRIS_<PRODUCT>_SERVICE_URL`, `IRIS_<PRODUCT>_URL` and `IRIS_<PRODUCT>_IDENTITY_URL` override the profile.

## Check prerequisites and choose the route

Use the project's own environment and package manager. The SDK supports Python 3.11+.
Check the installed package and CLI versions, framework extras, selected profile,
and how the application loads its environment. For a uv project, these are local checks:

```bash
uv run python --version
uv run python -c "from importlib.metadata import version; print(version('redis-iris'))"
uv run iris --json --no-input --version
uv run iris --json --no-input agent-playbooks service check --help
```

Use equivalent commands for other package managers. If absent, add `redis-iris`
through that manager; use `redis-iris[langgraph]` for its LangGraph adapter.
Respect the project's version constraints and the release's installation guidance,
including its pre-release requirements. On a uv project, a pre-release `redis-iris`
pins its product SDK pre-releases exactly, so `uv add` fails with
`hint: pre-releases weren't enabled`. Restate those pins under `[tool.uv]`
`constraint-dependencies` in `pyproject.toml`, copying the `==` pre-release entries
from that release's dependencies on its PyPI page (https://pypi.org/project/redis-iris/).
Check that the installed CLI/SDK exposes the options and methods the chosen path
uses; resolve incompatibilities before relying on them. An agent using another
language needs its documented integration rather than a replacement Python app.

Check credential presence without displaying values. Record the deployment kind,
intended Playbook ID, explicit remote URL, and required key roles. The SDK's URL
defaults to localhost, so a missing remote URL is not a usable remote setup.
The runtime key needs `read`, plus `propose` for submissions; publishing needs the
separate content key. Administrative tokens are needed only for the supported
self-managed administration path.

The application's `.env` contains `IRIS_AGENT_PLAYBOOKS_URL`,
`IRIS_AGENT_PLAYBOOKS_PLAYBOOK_ID`, and `IRIS_AGENT_PLAYBOOKS_API_KEY`.
Put `IRIS_AGENT_PLAYBOOKS_CONTENT_API_KEY` in `.env.content`, and load both files
only for content commands. For example, this observes published FAQ inventory:

```bash
uv run --env-file .env --env-file .env.content iris --json --no-input agent-playbooks faqs list --published
```

Launch the application with `.env` only, using its existing entrypoint (for
example, `uv run --env-file .env python agent.py` when that is the project's
launcher). Keep administrative credentials in their administrative process and
list empty variable names in `.env.example`; ignore all actual env files.

| Current state | Next action |
|---|---|
| New | Obtain access to the chosen deployment; create/select a Playbook and supply its keys. |
| Partial | Inspect existing connection settings, entry inventory, and serving versions. Reuse IDs, keys, and valid content; publish an intended draft explicitly instead of recreating it. |
| Existing and healthy | Verify the requested change against the current Playbook. Skip service creation, key minting, and content replacement that the task does not need. |

For an existing Playbook with runtime access only, verify discovery and the
application path. Record unavailable administrative checks without requesting
broader credentials for a task that needs only reads.

`--local` selects development endpoints and credentials; it does not install or
start the suite. Confirm the stack is running before provisioning. If the person
has no service/account access, hand off that specific prerequisite and continue
the local content/code work that does not depend on it. Use the deployment's
readiness/permission checks below once access is available.

## Self-managed suite or local stack

Record the requested settings in `playbook.yaml`:

```yaml
name: support-playbook
discovery: {faq_min_score: 0.3, skill_min_score: 0.3, max_results: 10}
key_actions: [read]  # add propose only if the application submits proposals
```

Embedding settings are create-only. When omitted, a suite uses `openai / text-embedding-3-small / 1536`; `--local` uses `noop / playbook-local / 384`. An explicit `embedding` block or embedding flags override those defaults, including under `--local`. To record an explicit selection, use the values supported by that deployment; for example:

```yaml
embedding: {provider: openai, model: text-embedding-3-small, dimensions: 1536}
```

For a suite, let the operator configure its service/Identity URLs and tokens in `.env.admin` and the selected profile. Load those credentials only in administrative command processes. For a local stack, append `--local` to each `service` command below. It selects development URLs and credentials, not a production deployment.

**Identity tokens.** Each product chart can run its own Identity Service. Then set the product's own `IRIS_AGENT_PLAYBOOKS_IDENTITY_TOKEN` (and `IRIS_AGENT_PLAYBOOKS_IDENTITY_URL`, or the profile's `identity_url`), and leave `IRIS_IDENTITY_URL` unset: it overrides every product's `identity_url` in the profile. On a suite with one shared Identity Service, `IRIS_IDENTITY_TOKEN` and `IRIS_IDENTITY_URL` cover every product. The CLI takes the token from `--identity-token`, then `IRIS_AGENT_PLAYBOOKS_IDENTITY_TOKEN`, then `IRIS_IDENTITY_TOKEN`, then the product's service token, which only works when the two are the same secret. The dry run lists that fallback under `warnings`.

```bash
iris --json --no-input agent-playbooks service create --from playbook.yaml --dry-run
iris --json --no-input agent-playbooks service create --from playbook.yaml --write-env .env
iris --json --no-input agent-playbooks service key PLAYBOOK_ID --role content --write .env.content
iris --json --no-input agent-playbooks service check PLAYBOOK_ID --env-file .env --env-file .env.content
```

Use the returned `playbookId` for `PLAYBOOK_ID`. Add `--require-propose` to `check` when the application submits proposals. The `read,write,publish` content key is separate from the runtime key. Include `playbook.yaml` in the project's change; keep env files ignored.

For an existing Playbook, inspect it with `service show PLAYBOOK_ID`; mint only missing keys with `service key`. A read-only runtime key uses `--actions read --write .env`; a proposing runtime key uses `--actions read,propose --write .env`. `service env PLAYBOOK_ID --write .env` writes connection settings without minting or blanking an existing key.

## Redis Cloud

Use the Cloud console for service administration. `service create`, `key`, `show`, `check`, and extraction administration reject Cloud profiles with `cloud_unsupported`; `service env` can still write known connection settings.

Have the operator create or select the Playbook in **Iris → Agent Playbooks**, obtain its Agent endpoint and Playbook ID from the Connect step or Configuration, and create keys in **Iris → Access & Identity**. The application needs `read`, plus `propose` if chosen. The separate content credential needs the permissions to read, write, and publish entries. Put the runtime settings in `.env` and the content key in `.env.content` using a local editor or secret manager.

Copy connection variable names into `.env.example` with empty values. Verify readiness, embedding/discovery settings, and key access in the console; then use the data-plane content commands and discovery. Continue at content authoring in the main skill.

## CLI execution and recovery

- Put `--json --no-input` before `agent-playbooks` on every call. Finite output is one JSON value on stdout; diagnostics and errors go to stderr.
- Run `create --dry-run` before creation. It sends no requests. Resolve all `missing` fields before writing; report `warnings`, including tenant-less grants or a service token reused for Identity access.
- Capture minted keys with `create --write-env PATH` or `key --write PATH`. Omitting the file in JSON mode prints the secret. Never request secrets in chat, pass them as command-line arguments, or print env-file contents.
- On `credential_required`, hand off `details.env`, product/profile, and `details.obtain`. On `unauthenticated` or `forbidden`, report `details.source` rather than guessing which credential failed.
- On `resource_exists`, use an existing-resource choice already authorized by the request or ask whether to reuse `details.id` or choose a different name. Never delete to retry. If a failed create reports `details.created: true`, reuse the created resource with `--reuse --write-env` to finish key delivery.
- Run `check` with the written env files after self-managed provisioning. Report the failing `details.hop`, `details.step`, and `details.cause`; it stops at the first failed hop. Agent grants require `read`, with `propose` checked when `--require-propose` is present. That option reports `grant_unverified` if the generated agent key name cannot be found; inspect custom-named keys in the Identity Service. Content grants always require `read,write,publish`.

Every error is one JSON value on stderr with `error.code`; credential errors also carry `details.env` and `details.obtain`, never the value. Stop on the first failure and relay it:

| `error.code` | Who acts | Action |
|---|---|---|
| `credential_required` | person | Set the variable in `details.env` in the agent's shell. See "Identity tokens" above. |
| `unauthenticated` | person | The token from `details.source` was refused: it expired or belongs to another deployment. Issue a new one. |
| `forbidden` | person | The token is valid but lacks the role or tenant. Use a token with the right role for that product. |
| `configuration_error` | person or agent | A URL is missing, such as `url`. Add it to the profile. |
| `invalid_request` | agent | HTTP 400. Fix the request the message names. |
| `resource_exists` | person | Decide: re-run with `--reuse` to adopt `details.id`, or choose another name. |
| `unavailable` | person | The hop is unreachable. Check the URL, the ingress and the service's pods. |
| `check_failed` | person | `details.hop` and `details.cause` name the broken hop. Fix it and re-run the check. |
| `cloud_unsupported` | person | The profile is `kind = "cloud"`. Follow `details.steps` in the console. |
| `input_error`, `usage_error` | agent | Fix the command. A destructive command under `--no-input` needs `--yes` from a person. |
