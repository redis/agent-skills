# Prefer Modern Redis Patterns

For new code, choose the modern operation that preserves the required semantics.
Redis accepting an older pattern is not a reason to add a compatibility branch.
Check server version, product support, ACL permissions and client capabilities.
For an existing application, identify its compatibility requirements before
changing authentication, stored data or message-delivery behavior.

| Existing pattern | Preferred choice for new code | Decision boundary |
|---|---|---|
| `KEYS` or whole-container reads over large collections | `SCAN`, `SSCAN`, `HSCAN`, `ZSCAN` | Iterate until cursor zero. `COUNT` is a hint; tolerate duplicates and concurrent changes. A scan is not a snapshot. Preserve atomicity when replacing a deliberately bounded atomic read. |
| `requirepass` and password-only authentication | A dedicated named ACL user with workload-specific command/key permissions and verified TLS | Set both username and password in client examples. `requirepass` configures the default ACL user's password; retain that route only for an explicit existing compatibility requirement. |
| Client-managed `EVAL`/`EVALSHA` for reusable server-side logic | Redis Functions (`FUNCTION LOAD`, `FCALL`) on supported Redis 7+ deployments | Plan library installation, permissions, replication/persistence and installation on every Cluster primary. Do not silently add script-cache fallback to a project that requires Functions. |
| Pub/Sub or a simple List queue used as a reliable work queue | Streams with consumer groups (`XADD`, `XREADGROUP`, `XACK`) | Use pending-entry recovery and an appropriate persistence policy. Acknowledge after successful processing; consumers must handle duplicate delivery. Pub/Sub suits ephemeral notifications; Lists remain suitable for simple queues. |
| Separate commands for one conditional or expiring value operation | `SET ... NX/XX EX/PX`, `GETDEL`, or `GETEX` where their semantics fit | `GETDEL`/`GETEX` need Redis 6.2+. `SET` options avoid a gap between writing and setting TTL. Standalone expiration commands still serve independent TTL changes. |
| Rewriting a serialized JSON String to change one field | Hash for flat independent fields; native JSON for nested path updates/indexing | Verify JSON support before using JSON commands. Strings remain appropriate for opaque or immutable payloads and counters. Do not migrate storage merely because JSON exists. |

## Server-side code and compatibility

Functions package server-side Lua as database-managed libraries. Prefer a
versioned deployment step for reusable application logic, separate library-loading
privileges from runtime command/key grants, and verify every Cluster primary.
Their durability follows the deployment's persistence and replication settings.
`EVAL` remains supported; it is not a Redis-deprecated command. Using it for a
specific existing compatibility requirement is different from adding an
unrequested EVAL/EVALSHA fallback to new Function-based code.

Neither a pipeline nor Functions make an unknown write outcome safe to replay.
A lost reply can follow a successful write. Retry only when non-execution is
proven or the application has an explicit idempotency/outcome-resolution design.

## Migration checks

- State the target version/product and any required legacy compatibility.
- Preserve atomicity, ordering, TTLs, key ownership and delivery guarantees.
- Distinguish an unsupported required capability from permission or transport
  failures. Report the actual limitation instead of silently changing the design.
- Keep valid uses of String, Hash, List and Pub/Sub; these data types are current
  Redis features. The problem is choosing a pattern that misses the requirements.

## References

- [SCAN guarantees](https://redis.io/docs/latest/commands/scan/)
- [ACL authentication and the default user](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)
- [Redis Functions and Cluster deployment](https://redis.io/docs/latest/develop/programmability/functions-intro/)
- [Pub/Sub delivery semantics](https://redis.io/docs/latest/develop/pubsub/)
- [Streams and consumer groups](https://redis.io/docs/latest/develop/data-types/streams/)
- [SET options](https://redis.io/docs/latest/commands/set/)
- [GETDEL](https://redis.io/docs/latest/commands/getdel/)
- [GETEX](https://redis.io/docs/latest/commands/getex/)
- [Redis JSON](https://redis.io/docs/latest/develop/data-types/json/)
