# Use Agent Memory as a proposal source

Read this only when the application records sessions in Agent Memory and background FAQ extraction is wanted. This requires a self-managed deployment with the extraction worker running and Playbook connected to the Memory Identity Service. Cloud profiles reject this CLI administration path.

One extraction binding is supported per Playbook. Inspect existing bindings before creating one:

```bash
iris --json --no-input agent-playbooks extraction list --playbook-id PLAYBOOK_ID
iris --json --no-input agent-playbooks extraction bind MEMORY_STORE_ID --playbook-id PLAYBOOK_ID --enable
```

Run these commands with the Playbook service URL/token configured in the administrative environment; append `--local` for a local stack. Supply IDs from prior command results or trusted configuration. The binding takes the whole store; namespace selection is unsupported. The service validates store ownership/access during creation and every explicit enable. An accepted create is `READY` and disabled; `--enable` enables it after creation.

Sessions idle for the window (default 60 seconds; `--idle-seconds` accepts 60–86400) become eligible for the worker's next scan. Scan cadence is deployment configuration. Extracted FAQ proposals carry session/event source context; inspect the inbox to assess their quality before relying on them.

Choose whether application-owned submissions or extraction supplies each proposal path. Enabling both can submit overlapping content; identical-candidate deduplication does not guarantee that differently generated candidates collapse. Once extraction meets the application's needs, disable its redundant per-answer submission path.

A binding in `BLOCKED` reports a reason such as `source_not_found` or `source_access_denied`. Fix the source, then revalidate it:

```bash
iris --json --no-input agent-playbooks extraction enable BINDING_ID --playbook-id PLAYBOOK_ID
```

[Extraction reference](https://github.com/redis/redis-iris/blob/main/docs/user_guides/agent-playbooks-cli.md#extraction-from-agent-memory).
