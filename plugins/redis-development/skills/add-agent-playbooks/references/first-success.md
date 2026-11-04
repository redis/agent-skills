# Verify the first application turn

Read this after the chosen content is published and the application is wired. For an existing integration, verify the changed behavior and reuse the working parts. This is the application verification loop; deployment checks belong to provisioning, and content commands belong to authoring.

## Select one useful scenario

Use an approved example from the actual application. Record the expected content key, serving version, and observable behavior before running it. Reuse the application's launcher, test client, or endpoint; record the exact invocation and required env-file names without secret values. A standalone SDK discovery call verifies retrieval only.

With the illustrative content in the authoring reference, a useful scenario is:

| Case | Question | Expected evidence |
|---|---|---|
| Direct | How do I request a refund? | `refund-request` appears at its serving version; the response uses its approved guidance. If refund intake is also selected, its procedure is loaded before following the steps. |
| Paraphrase | What details do you need to give me my money back? | The same relevant guidance is available despite different wording. |
| Uncovered | Can you approve a mortgage for me? | The application's agreed clarification/escalation response; no invented policy or unsupported action. |

Replace these with project-specific questions and expected keys. Test only the content types configured. With multiple audiences, also verify that the application's trusted audience selects the intended content.

## Execute, inspect, correct, repeat

1. **Run the actual application path.** For a procedure, execute the model/tool loop far enough to observe loading and the next required step. Use a harmless scenario that fits the application's authorization rules.
2. **Inspect the evidence.** Record discovered keys, serving versions, and scores. For hooks, confirm the above-threshold procedure reached the actual prompt. For disclosure, inspect the executed `load_skill` key/version and tool result, including resource reads if needed. Use existing trace facilities when available; otherwise inspect the prompt/tool results through the application's test/debug path.
3. **Judge the response against the selected source.** Check that it quotes the approved facts or follows the loaded steps and respects the missing-content policy. A retrieved preview does not prove a procedure was followed. Capturing a prompt/tool trace proves wiring; evaluating model behavior requires a real model run.
4. **Fix observed gaps, then rerun the affected case.** Use the table below. Keep the original framework and business tools. Once the direct case works, run its paraphrase and uncovered case. Record the outcome of each; do not round partial verification up to success.

| Observation | Inspect or correct |
|---|---|
| Content absent | Serving publication, exact audience/filter attributes, query relevance, discovery thresholds, and `truncated`/`budget_truncated`. An identical draft needs explicit publication. |
| Irrelevant content returned | Description/question/intents, filters, scores, and application relevance handling. Choose thresholds from representative results. `noop` local embeddings cannot establish semantic retrieval quality. |
| Menu present, procedure absent | Hooks threshold; for disclosure, model instructions and registration of the same tools with the model and executor. |
| Old context persists | Rebuild from the base prompt; verify the adapter replaces its context message and loads the menu's version. |
| Unsupported answer | Missing-content response policy and the application's acceptance gate. Publication controls retrieval, not every claim a model generates. |
| Agent call fails | SDK/CLI version, env loading before initialization, URL, permissions, and the actual failing operation; use provisioning's deployment-specific checks. |

If automatic proposals are enabled, inspect the receipt/inbox after an uncovered answer. Replay the identical candidate to verify deduplication; another model-generated answer can legitimately create another proposal. Preserve application-owned gates and keep this check out of serving publication.

For missing-configuration handling, use a fresh object/test process with the ID or agent key omitted: the first remote operation must name the missing setting. The constructor is lazy and the URL has a localhost default. Keep the running application's environment intact.

If credentials, services, or a model are unavailable, finish the local work and report the precise missing prerequisite. Deterministic model/HTTP fixtures can verify wiring and requests; label them as offline rehearsals. Keep live retrieval quality, real model behavior, and production verification unconfirmed until observed.

## Handoff

Show the user the result and how to operate it. Use actual values from the run:

- **Connected:** deployment/profile and Playbook ID; content source files and runtime integration locations.
- **Observed:** question, discovered key/version, loaded procedure/version when applicable, and the relevant response or next procedural step. Include a verified UI/trace link when available; otherwise name the CLI inspection command.
- **Repeat:** the exact application invocation and env-file names. For an interactive app, include the request or question to submit.
- **Ownership:** who edits the content and which existing person/process publishes it. Preserve established ownership; ask if it cannot be established.
- **Next update:** the approved edit/validate/preview/publish/verify path from content authoring.
- **Remaining:** offline versus live checks, unresolved prerequisites, and production runtime variables or content-publishing configuration still to supply. Prepare requested configuration changes using the project's deployment conventions; deploy only within the user's authorization.

For example, after observing it: “Your application answered the refund question using `refund-request v1` and loaded `refund-intake v1`. Here is the response, the repeat command, and where to update the content.” Omit unsupported parts of that statement when only one content type or an offline rehearsal was verified.
