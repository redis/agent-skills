---
name: redis-docs-mcp
description: Working with the redis-docs MCP server (search / fetch / ask at redis.io/mcp) — how its index is shaped and how to read what it returns. Use when those tools are available and you are about to look something up in the Redis documentation, or when a result is confusing — fetch returned one short section instead of a page, several hits share one url, ids look like #sec:w1, metadata.version reads 1.0.0, a search came back empty, or ask was rate-limited or said the docs do not cover it. Also covers what redis.io does and does not index.
license: MIT
metadata:
  author: Redis, Inc.
  version: "0.1.0"
---

# Redis Docs MCP

The `redis-docs` server exposes the redis.io documentation over MCP as `search`, `fetch`, and `ask`. Those tools carry their own descriptions, and on *when* to call each one they are accurate — start with `search`, `fetch` what you need, keep `ask` for questions that span several areas. This skill covers what they get wrong or leave out.

## When to apply

- You are about to look something up through these tools.
- A result did not look like what the tool description promised.
- A `search` came back empty, or `ask` was rate-limited or declined to answer.

Reach for the sibling Redis skills first where they cover the topic — they carry curated guidance that raw docs pages do not. Use these tools to verify specifics and fill gaps.

## 1. Ids address sections, not pages

The tool descriptions say `search` returns "pages" and `fetch` returns "one Redis documentation page". The index is per **section**, and ids come in four shapes:

| Shape | Example | What `fetch` returns |
|---|---|---|
| Bare page | `commands/expire` | The whole page — ~7 KB for EXPIRE, examples and appendices included |
| Named anchor | `develop/using-commands/keyspace#sec:key-expiration` | That section |
| Ordinal window | `develop/ai/search-and-query/advanced-concepts/expiration#sec:w0` | That window, ~1–2 KB |
| Anchor + window | `develop/clients/jedis/connect#sec:configure-a-connection-pool-w0` | That window of that section |

What follows from this:

- **Repeated urls in one result set are not duplicates.** Several hits often share a page url while carrying distinct ids — they are different sections of the same page. Tell them apart by their snippets, not their urls.
- **`#sec:wN` ordinals are index windows.** They come back in relevance order, not `w0, w1, w2`. Don't try to reassemble a page out of snippets; `fetch` the section you actually need.
- **Never construct an id.** Valid ids come from a `search` result or an `ask` result's `sources[].id`. Guessing happens to work for `commands/<name>` and fails on everything with sections.
- **Snippets are truncated prefixes of the body, not summaries.** When one cuts off mid-word right at the interesting part, `fetch` on that id is guaranteed to contain the continuation — no need to re-search with different words.
- **Cite the page `url` and name the section in prose.** `#sec:w1` is an index address, not a web anchor; only the named-anchor shape yields a url with a usable fragment.

Link targets are stripped from returned text — `` [`DEL`]( ) `` — so a link cannot be followed out of a fetched body. `search` for the term instead.

## 2. `metadata.version` means "added in", not "current as of"

`fetch` returns `metadata` with `topic`, `version`, and `section`. On a `commands/*` page that `version` is the release the command was **introduced** in — `commands/setex` reports `2.0.0`, `commands/hexpire` reports `7.4.0`. Useful for "when did this land", and nothing more: `commands/expire` reports `1.0.0` while its own body documents a behavior change in 2.1.3 and a Redis 8 interaction with Redis Search. Outside `commands/*` the field is often not a release at all — a Redis Search page reports `stack`, a product channel.

So never answer "did this change in Redis N?" from `metadata.version`. Read it from the body text, which states it explicitly ("Before Redis 8…", "since Redis 7.4"), and cite that.

## 3. What the corpus covers

The index is redis.io only — but that is broader than it sounds. Per-language client **usage guides** are indexed and returned (`develop/clients/redis-py/connect#sec:…`, `develop/clients/jedis/connect#sec:…`), along with the `integrate/…` pages, the Redis Software and Redis Cloud operational docs under `operate/…`, and the Kubernetes operator's generated CRD reference. So search first, including for client-library and Enterprise questions.

The gap worth knowing is symbol-level reference for client libraries: search for how to use a connection pool and you will find it, search for every keyword argument on its constructor and you will not. That lives in the library's own API reference or source.

Genuinely outside the index: GitHub issues and discussions, package-manager pages (PyPI, npm, Maven), and third-party posts.

When a search misses, that means "not on redis.io" — not "does not exist". Say which one you mean.

## 4. `ask` costs more than it looks

- **~4 requests/minute per IP**, and that budget is shared by everyone behind the same NAT, so an office or a CI runner can exhaust it collectively.
- **A hard output cap**, so it truncates on broad questions. Ask one narrow thing at a time.
- **On a refusal, do not retry it reworded.** "The documentation does not cover this" is a grounded result, not a parsing failure. Fall back to `search` + `fetch`, which touches no model and draws on a separate, looser budget.
- **`ask` → `sources[].id` → `fetch`** when you want the primary source behind a synthesized answer.

Question text reaches Redis and the model provider behind the gateway, so prefer a generic question about the Redis command or behavior over pasting in proprietary code.
