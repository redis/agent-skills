# Replace a semantic response cache

Read this only when the application stores generated answers and serves them to later users. Preserve its existing shareability/privacy judge and generic-turn check throughout the migration.

## Lookup

Replace the cache lookup with `playbook.discover(question, audience=...)`. Serve `found.best_faq.faq.answer` directly only when the score clears a threshold calibrated on representative queries and the turn is generic: no user-specific facts and no correction request. Similarity selects guidance; the application decides whether the answer applies.

Otherwise put the discovery menu into the prompt and use the selected retrieval mode from the main skill. A Skill preview contains its description; load its instructions before following the procedure.

## Store

Replace cache writes with `playbook.propose_faq(key=..., question=..., answer=...)` behind the existing judge. Normalize the candidate there when needed. Keep the same audience attributes and bind trusted provenance in application code.

The agent key needs `propose`. An identical candidate resolves to the retained proposal; a different answer can create another. Nothing becomes serving content until a reviewer accepts and publishes it. Automatic `propose_uncovered` hooks submit unchanged answers without a judge, source, or evidence; leave them off when this application-owned submission path is used.

## Correction and removal

Proposals submit new-entry candidates. A correction proposal does not withdraw or replace a published FAQ. Have the operator explicitly withdraw the stale entry or publish the intended historical version:

```bash
iris --json --no-input agent-playbooks faqs withdraw ENTRY_KEY
iris --json --no-input agent-playbooks faqs publish ENTRY_KEY --version N
```

Those are alternatives chosen for the correction, not a sequence to execute automatically.

After verification, remove the replaced cache client, settings, embedding pipeline, and cache-only normalization code. Retain normalization and judge checks needed for proposal quality or privacy, along with the generic-turn check.
