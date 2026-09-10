# Project Assessment: Task Management System vs. PROMPT.md

- **Date:** 2026-09-10
- **Commit assessed:** `5350579` ("Implement task management system with HTTP, MCP, and web UI")
- **Method:** Static review of all source, plus live execution — built both workspaces, ran the test suite, probed the running HTTP API with curl, and probed the MCP server through the SDK's own client.

**Verdict: solid architecture and clean deliverables, undermined by real correctness bugs at the interface boundaries — exactly the layers the prompt emphasizes.**

## Strengths

- **Architecture delivers the diagram.** HTTP and MCP both delegate to a shared `TaskService`; neither touches SQLite. Layering is real, not ceremonial: `server/src/application/task-service.ts:16` is the single choke point both interfaces call.
- **Sensible tech judgment.** `node:sqlite` avoids native builds; prepared statements, parameterized queries, WAL for concurrent HTTP+MCP processes. No ORM, per the prompt. Domain transitions are pure and idempotent (`server/src/domain/task.ts`).
- **Deliverables complete.** All 7 README items including MCP example, bonus discussion, and the final question. MCP tool names mirror the prompt's suggested set. Commit attribution per `AGENTS.md`.
- **Tests exist** for domain + service (6 passing), using real `:memory:` SQLite — honest integration, zero extra dependencies.

## Obvious bugs (verified by execution)

1. **Every HTTP error is a 500.** There is no `setErrorHandler`. Probed live: empty description → 500, bad enum → 500, unknown UUID → 500, malformed UUID → 500. Validation failures should be 400; not-found should be 404. `server/src/http/api.ts` throws `ZodError`/`TaskNotFoundError` and Fastify has no mapping.
2. **MCP has zero input validation.** `create_task` with no arguments silently creates a task literally described `"undefined"` (`server/src/mcp/server.ts:97` — `String(undefined)`). `get_task` with no id → `"Task not found: undefined"`. The README's claim that "zod validates HTTP and MCP inputs" is **false for MCP** — inputs are raw casts. Root cause: using the low-level `Server` API with manual `String()` casts instead of `McpServer`/`registerTool` with zod schemas, which would validate for free.
3. **`list_tasks` MCP description lies.** It says "Defaults to outstanding tasks," but the service's no-filter path returns *both* pending and completed (`server/src/persistence/sqlite-task-repository.ts:88`). An agent trusting the description gets wrong semantics. Fix the default or fix the description.

## Not-obvious issues

4. **README architecture diagram says "better-sqlite3"** (`README.md:136`) — the code uses `node:sqlite`. Stale doc contradicting the decisions section two paragraphs later.
5. **`DB_PATH` relative-path trap.** The Claude Desktop config in the README spawns the server with the *client's* cwd, so `./data/tasks.db` resolves elsewhere and the claimed "visible in the web UI" silently breaks. Should default to a path anchored to the module, or the config should set `DB_PATH` absolute.
6. **Node version docs contradict** — "Node.js 22+" (`README.md:15`) vs. "Node.js 20+" (`README.md:27`). And `node:sqlite` is only unflagged on ≥22.13; early 22.x needs `--experimental-sqlite`. No `engines` field in `package.json` enforces any of this.
7. **CORS `origin: true` + `host: '0.0.0.0'`** (`server/src/http/api.ts:41,46`): any webpage you visit can read and mutate your tasks via `localhost:3000` (there is no auth). The Vite proxy already handles dev, so CORS is gratuitous; the bind should be localhost.
8. **Whitespace-only descriptions create empty tasks** — zod `min(1)` runs *before* the domain's `.trim()`, so `"   "` passes validation and trims to `""`.
9. **The test suite skips the layers where every bug above lives.** Fastify's `app.inject()` and the SDK client (used here to probe) make HTTP/MCP tests cheap — their absence is why the 500s and the "undefined" task shipped.
10. **MCP output is prose, not structured data.** The prompt asks for "structured information an agent can act upon"; agents must regex IDs out of `"Task <uuid>: ..."`. `structuredContent` or JSON text would match the requirement better.
11. **Minor:** `nix flake check` is a no-op quality gate (no checks defined); domain layer uses `randomUUID`/`new Date()` (impure, untestable clocks); no graceful shutdown for the HTTP server (WAL files dangle); web test script is an echo placeholder.

## Summary

The *thinking* is right — separation, soft deletes, stdio transport, minimal deps, honest scope. But the prompt explicitly weights "API Design" and "MCP Design," and both interfaces fail edge-case handling in ways a couple of `inject()`-based tests would have caught. If this were submitted as-is, the architecture section would score well and the interface sections would lose points that were avoidable in an afternoon: an error handler (~10 lines), MCP zod validation (switch to `registerTool`), and three doc fixes.

## Verification

- **Date:** 2026-09-10
- **Verified by:** opencode-go/kimi-k2.7-code
- **Method:** Rebuilt both workspaces with `nix develop -c npm run build`, ran `nix develop -c npm run test` (6 passing), started the HTTP server on a temporary database and probed edge cases with `curl`, and connected to the MCP server through the SDK's own `StdioClientTransport` to exercise each tool.

All claims above were confirmed:

1. Empty description, bad enum, unknown UUID, and malformed UUID all returned HTTP 500.
2. `create_task {}` created a task described `"undefined"`; `get_task {}` and `complete_task {}` returned `"Task not found: undefined"`.
3. `list_tasks {}` returned both completed and pending tasks, contradicting the "Defaults to outstanding tasks" description.
4. `README.md:136` still says "better-sqlite3" while the code uses `node:sqlite`.
5. The default `./data/tasks.db` remains relative to the process cwd, so the README's Claude Desktop config resolves it from the client's cwd.
6. README still lists both "Node.js 22+" and "Node.js 20+"; no `engines` field exists.
7. `server/src/http/api.ts` still sets `origin: true` and binds `host: '0.0.0.0'`.
8. `"   "` passed HTTP and MCP validation and produced a task with an empty description.
9. Tests still cover only domain + service layers; no HTTP or MCP tests exist.
10. MCP tool responses are still plain text from `formatTask`.
11. `nix flake check` still evaluates only the devShell derivation; `domain/task.ts` still uses `randomUUID`/`new Date()`; the HTTP server still has no graceful shutdown; the web test script is still an `echo` placeholder.

**Conclusion:** the assessment's verdict and bug list remain accurate at this commit.

## Current status

- **Date:** 2026-09-10
- **Updated by:** opencode-go/kimi-k2.7-code

The following issues have been remediated since the initial assessment:

| Claim | Status | Commit | Notes |
|-------|--------|--------|-------|
| 1. HTTP errors all return 500 | **Fixed** | `c85f4d9` | Fastify `setErrorHandler` maps `ZodError` → 400 and `TaskNotFoundError` → 404. |
| 2. MCP has zero input validation | **Fixed** | `6bed6f3` | MCP server now uses `McpServer`/`registerTool` with zod schemas. |
| 3. `list_tasks` description lies | **Fixed** | `6bed6f3` | `list_tasks` now defaults to pending tasks, matching its description. |
| 6. Node version docs contradict | **Fixed** | `d7ff11e` | README now says Node.js 22.13+ consistently; `engines` field added to all `package.json` files. |
| 7. CORS + `0.0.0.0` bind | **Fixed** | `c85f4d9` | Server binds to `127.0.0.1`; `@fastify/cors` removed. |
| 8. Whitespace-only descriptions | **Fixed** | `c85f4d9` / `6bed6f3` | HTTP and MCP now trim before validating `min(1)`. |
| 4. README diagram says `better-sqlite3` | **Fixed** | (current) | Architecture diagram now says `node:sqlite`; matches the decisions section. |
| 5. `DB_PATH` relative-path trap | **Fixed** | (current) | HTTP and MCP entry points default `DB_PATH` to a path anchored to the server module (`server/data/tasks.db`), independent of the client's cwd. |
| 9. No HTTP/MCP tests | **Fixed** | (current) | Added `http/api.test.ts` (Fastify `inject`) and `mcp/server.test.ts` (SDK client over stdio). Test count went from 6 to 22. |
| 10. MCP output is prose | **Fixed** | (current) | All MCP tools now declare `outputSchema` and return `structuredContent`; text remains for human readability. |
| 11. No graceful HTTP shutdown | **Fixed** | (current) | HTTP entry point registers `SIGINT`/`SIGTERM` handlers that close Fastify and the repository. |

Remaining issues to address:

- **Claim 11 (partial):** `nix flake check` is still a no-op (no checks defined in `flake.nix`).
- **Claim 11 (partial):** Domain layer still uses `randomUUID`/`new Date()` (impure, untestable clocks).
- **Claim 11 (partial):** Web test script is still an `echo` placeholder.

## Updated verification

- **Date:** 2026-09-10
- **Verified by:** opencode-go/kimi-k2.7-code
- **Method:** Rebuilt both workspaces with `nix develop -c npm run build`, ran `nix develop -c npm run test` (22 passing, including new HTTP and MCP interface tests), and probed the MCP server with a standalone SDK client script.

All remediated claims were confirmed:

1. HTTP validation and not-found errors now return 400/404 (verified by `http/api.test.ts`).
2. MCP `create_task {}` now returns a validation error instead of creating an "undefined" task.
3. MCP `list_tasks {}` now defaults to pending tasks only.
4. `README.md:136` now says `node:sqlite`.
5. Default `DB_PATH` is now anchored to the server module; launching the MCP server from a different cwd no longer loses the database.
6. README consistently says Node.js 22.13+; `engines` fields are present.
7. `server/src/http/api.ts` binds `127.0.0.1` and no longer enables CORS.
8. `"   "` is rejected by both HTTP and MCP.
9. HTTP and MCP interface tests exist and pass.
10. MCP tool responses include `structuredContent` matching their declared output schemas.
11. The HTTP server now has a graceful shutdown handler; the remaining minor issues (`nix flake check`, impure domain clocks, web test placeholder) are still present.

---

*Assessment generated with the [opencode](https://opencode.ai) CLI harness using the opencode-go/glm-5.3 model.*
