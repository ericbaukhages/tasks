# Project improvement prompt

You are a staff engineer reviewing this repository. The application code is largely correct — tests pass, the architecture is clean, and the MCP/HTTP/web interfaces work — but the project layout, documentation, and build workflow show clear agent fingerprints. Your job is to refactor the repository so it is consistent, maintainable, and professional without changing behavior.

## Principles

- Preserve all existing behavior. Do not add features.
- Keep the monorepo structure (npm workspaces: `server`, `web`).
- Keep the Nix/just workflow working: `just build`, `just test`, `just lint`, `just check`, `just serve`, `just dev-web`.
- Update docs (README, AGENTS.md, `docs/index.html`) so they stay accurate and in sync.
- Prefer small, focused edits. Do not over-engineer.

## 1. Fix the broken web dev workflow

The documented quick-start (`just serve` + `just dev-web`) does not work:

- The web client calls `/api/tasks` (`web/src/api.ts`).
- The server registers routes at `/tasks` (`server/src/http/api.ts`).
- The Vite proxy forwards `/api` to `http://localhost:3000` without a path rewrite.

As a result, the browser hits `http://localhost:3000/api/tasks` and gets a 404.

Choose one consistent approach and apply it everywhere:

1. Mount the API under `/api` and keep the client using `/api`; OR
2. Drop the `/api` prefix from the client and proxy `/tasks` to the server; OR
3. Keep the client using `/api` and add a Vite proxy `rewrite` to strip `/api`.

Verify by running `just serve` and `just dev-web`, then creating and listing tasks in the browser.

## 2. Eliminate duplicated domain types

`Task` and `TaskStatus` are defined in two places:

- `server/src/domain/task.ts` (canonical source)
- `web/src/types.ts` (copy, missing `deletedAt`)

Introduce a shared source of truth. Options, in order of preference:

1. Create a small workspace package (e.g., `packages/types`) that both `server` and `web` depend on.
2. Re-export `server/src/domain/task.ts` from `web/src/types.ts` if a separate package is too heavy.

Either way, the web must use the exact same `Task` type as the server, including `deletedAt`. Remove `web/src/types.ts` if it becomes redundant.

Also centralize the zod schemas that describe tasks:

- `server/src/persistence/sqlite-task-repository.ts` defines `taskRowSchema`.
- `server/src/mcp/server.ts` defines a similar `taskSchema` for tool output.

Refactor so the MCP schema derives from the domain type or a shared schema, not a hand-maintained duplicate.

## 3. Remove generated artifacts and stale directories

The following files/directories are build outputs that should not live next to source code:

- `server/dist/`
- `web/dist/`
- `web/dist-test/`
- `web/vite.config.js`
- `web/vite.config.d.ts`
- `web/tsconfig.tsbuildinfo`
- `web/tsconfig.node.tsbuildinfo`
- Root `data/` (legacy leftover; `server/data/` is the intended location)
- `web/public/` (empty)

They are already ignored by `.gitignore`, but they clutter the working tree. Remove them. Consider adding a `clean` script (e.g., `rm -rf server/dist web/dist web/dist-test web/vite.config.js web/vite.config.d.ts web/tsconfig.tsbuildinfo web/tsconfig.node.tsbuildinfo`) and a root `clean` just recipe.

Also review `.gitignore`:

- The `data/` pattern matches any directory named `data` anywhere, including `server/data/`. Make the ignore explicit (e.g., `/data/` for the root only) or remove it if it is no longer needed.

## 4. Consolidate duplicated configuration logic

### Default database path

Both entry points compute the same default DB path:

- `server/src/http/server.ts`
- `server/src/mcp/server.ts`

Extract a shared helper, e.g., `server/src/config.ts`, that returns the path from a single source.

### Input validation

The `description: z.string().trim().min(1)` validation appears in both HTTP and MCP. Extract a shared schema or helper (e.g., in `server/src/application/validation.ts`) so the two interfaces cannot diverge.

### Error formatting

Both `server/src/http/api.ts` and `server/src/mcp/server.ts` contain logic for mapping `ZodError` / `TaskNotFoundError` into user-facing messages. Consider a shared error mapper.

## 5. Consolidate TypeScript configuration

There are four tsconfig files for a tiny repo, and no root config tying the workspaces together:

- `server/tsconfig.json`
- `web/tsconfig.json`
- `web/tsconfig.node.json`
- `web/tsconfig.test.json`

This is excessive. Clean it up:

1. **Add a root `tsconfig.json`** with project references to `server` and `web` so the monorepo has a single entry point and IDEs can see cross-workspace types.
2. **Stop the web node config from emitting artifacts.** `web/tsconfig.node.json` only exists to type-check `vite.config.ts`, yet it emits `web/vite.config.js` and `web/vite.config.d.ts`. Either:
   - Set `noEmit: true` (and drop `composite`) in `web/tsconfig.node.json`; or
   - Stop referencing it from `web/tsconfig.json` and let Vite/IDEs type-check it independently.
3. **Unify how tests are compiled.** The server includes tests in its main `tsconfig.json` and runs them from `server/dist/`. The web uses a separate `tsconfig.test.json` and `web/dist-test/`. Pick one pattern and use it in both workspaces.
4. **Drop unnecessary flags.** `web/tsconfig.json` enables `allowImportingTsExtensions`, but every web import uses `.js` extensions. Remove the flag if it is not needed.
5. **Align module/target choices where possible.** The web test config uses `NodeNext` because it runs under Node's test runner, but the web app config uses `ESNext`/`bundler` for Vite. That split is fine, but document why it exists and keep it minimal.

Goal: a developer should be able to open the repo and understand the TypeScript setup in under a minute.

## 6. Clean up `docs/`

`docs/` is deployed to GitHub Pages, but it currently contains internal documents:

- `docs/assessment.md` — stale, self-referential, and contains contradictory test counts and stale line-number references.
- `docs/user-actions.md` / `docs/task-data.md` — raw requirement notes without headings.

Decide:

- Move internal notes and the assessment out of `docs/` (e.g., to `notes/` or delete them if no longer useful).
- If `docs/assessment.md` must stay, update it or trim it to a short "assessment summary" without stale line numbers.
- Make `docs/index.html` consistent with `README.md` and `AGENTS.md`. Consider whether the README should be the single source of truth and the HTML page a generated/hand-maintained mirror.

## 7. Fix CI and tighten quality gates

`.github/workflows/ci.yml` never installs dependencies. It runs `nix develop -c npm run build` immediately after checkout, which will fail on a fresh runner. Add an explicit install step:

```yaml
- name: Install dependencies
  run: nix develop -c npm ci
```

Also consider making `nix flake check` more useful:

- Add a check that `npm run build` succeeds.
- Add a check that `npm run test` succeeds.
- Keep the existing static-invariants checks if they still apply.

## 8. Improve naming and minor inconsistencies

- `server/src/http/api.ts` exports `startHttpServer`, which is imported by `server/src/http/server.ts`. The file named `server.ts` calling a function also named `startHttpServer` from `api.ts` is confusing. Rename the module or function so intent is clear (e.g., `api.ts` exports `buildApp` and `startServer`, and `server.ts` is the CLI entry point).
- `server/src/application/task-service.ts` imports the domain module as `import * as Task`, leading to `Task.Task` and `Task.TaskClock`. Consider renaming the domain module exports or using named imports to avoid the stutter.
- The web test mocks `window.location.origin = 'http://localhost:3000'`, but the real client uses relative URLs for every endpoint except `listTasks`. Make the client consistent: either always use an absolute base URL or always use relative URLs.
- The Vite proxy target is `http://localhost:3000` while the server binds to `127.0.0.1`. On some systems `localhost` resolves to `::1`, which can cause proxy failures. Align them (prefer `127.0.0.1`).
- Root `package.json` exposes `serve` and `mcp` scripts but not `dev-web`. Add a `dev-web` script that delegates to the web workspace for consistency with AGENTS.md.

## 9. Add a formatting / style convention

There is no Prettier, dprint, or `eslint` stylistic rule set. Pick one lightweight formatter (Prettier is fine; dprint is lighter) and add a config. Add a `just format` recipe and, optionally, a CI check that the tree is formatted. This prevents style drift and makes future diffs readable.

## 10. Fix testing workflow inconsistencies

- The server test script is `node --test 'dist/**/*.test.js'`, which requires a prior `npm run build`. The web test script compiles tests first (`tsc -p tsconfig.test.json && node --test ...`). Unify the pattern: make the server tests compile before running, or make the root `test` script depend on `build`.
- There is no coverage tooling or any integration test that exercises the web UI against the real API/proxy.
- The MCP test parses task IDs out of text responses with a regex, even though `structuredContent` is available. Use the structured data instead.

## 11. Align HTTP and MCP list defaults

- `GET /tasks` with no `status` query returns **all non-deleted tasks** (pending + completed).
- MCP `list_tasks` with no `status` argument returns **only pending tasks**.

Pick one default, apply it to both interfaces, and update the README curl examples and tests to match.

## 12. Harden the Nix flake

- `flake.nix` uses `pkgs.nodejs`, which is not pinned to the required Node 22.13+. Use an explicit `pkgs.nodejs_22` (or verify `pkgs.nodejs` meets `>=22.13.0`) and assert it in the flake checks.
- `checks.static-invariants` only greps README/package.json strings. It does not prove the project builds or passes tests. Add checks that run `npm ci`, `npm run build`, `npm run test`, and `npm run lint` inside the Nix sandbox.
- The flake depends on `flake-utils` only to iterate over default systems. For a repo this small, consider replacing it with a simple `systems` list to reduce external inputs.

## 13. Clean up web client URL handling

- `listTasks` builds an absolute URL from `window.location.origin`, while every other helper in `web/src/api.ts` uses a relative URL. Make the client consistent.
- The web test mocks `window.location.origin = 'http://localhost:3000'`, which is misleading because the real dev setup serves the web app and API from the same origin via the Vite proxy. Align the test with the real client behavior.

## 14. Eliminate duplicated status literals

The string union `'pending' | 'completed'` (and the zod equivalent `z.enum(['pending', 'completed'])`) appears in:

- `server/src/domain/task.ts`
- `server/src/persistence/sqlite-task-repository.ts`
- `server/src/http/api.ts`
- `server/src/mcp/server.ts`
- `web/src/types.ts`

Define `TaskStatus` once in the shared types package and reuse it everywhere.

## 15. Keep README / docs / code in sync

- README curl examples call `http://localhost:3000/tasks` directly. After fixing the `/api` prefix (section 1), ensure all docs match the chosen API path.
- `docs/index.html` duplicates quick-start and architecture text from `README.md`. If the Pages site stays hand-written, add an AGENTS.md reminder (or a CI check) that it must be updated whenever README changes.
- Remove or archive `docs/assessment.md`; it claims no remaining issues while the layout problems in this prompt still exist.

## 16. Remove dead code and minor polish

- `server/src/domain/task.ts` exports `isPending()` and `isCompleted()` helpers, but nothing imports them. Delete them or use them in the UI/filter logic.
- `server/src/application/task-service.ts` imports the domain module as a namespace (`import * as Task`), producing the awkward `Task.Task` type and `Task.TaskClock`. Switch to named imports or rename the domain exports.
- The MCP server hardcodes its name/version (`tasks-mcp-server`, `0.1.0`) instead of reading from `server/package.json`.
- `web/index.html` has a bare `<title>Tasks</title>` while the Pages site uses the longer tagline. Align titles if the HTML page is meant to match the marketing page.
- `eslint.config.js` only lints `**/*.ts`/`**/*.tsx`, so generated `web/vite.config.js` is currently skipped. If JS linting is ever enabled, it will be linted. Add the generated files to the `ignores` block defensively.

## 17. Centralize server bootstrap

Both server entry points do the same wiring by hand:

- `server/src/http/server.ts`: `mkdirSync`, `new SqliteTaskRepository`, `new TaskService`, start Fastify.
- `server/src/mcp/server.ts`: `mkdirSync`, `new SqliteTaskRepository`, `new TaskService`, register tools.

Extract a shared bootstrap function (e.g., `createTaskService(dbPath)` in `server/src/application/bootstrap.ts`) that returns `{ repo, service }`. The HTTP and MCP entry points should only call that function and then start their respective transports.

## Acceptance criteria

Before declaring the task done, verify all of the following:

- [ ] `just build`, `just test`, `just lint`, and `just check` pass.
- [ ] `just serve` + `just dev-web` allows creating, completing, and deleting tasks in the browser without 404s.
- [ ] `just mcp` still works and reads/writes the same database as the HTTP server.
- [ ] No `Task`/`TaskStatus` type is duplicated between `server` and `web`.
- [ ] The default DB path is computed in exactly one place.
- [ ] TypeScript configs are reduced to the minimum needed: ideally a root `tsconfig.json` plus one app/test config per workspace, with no configs that emit artifacts next to source.
- [ ] Generated artifacts (`dist`, `dist-test`, `vite.config.js`, `vite.config.d.ts`, `*.tsbuildinfo`, root `data/`) are removed from the working tree.
- [ ] CI installs dependencies before building.
- [ ] README, AGENTS.md, and `docs/index.html` agree on quick-start, commands, architecture, and API path.
- [ ] Internal/stale documents are no longer deployed to GitHub Pages.
- [ ] Server and web test scripts follow the same build-then-test pattern.
- [ ] HTTP and MCP `list` endpoints use the same default status filter.
- [ ] Nix flake pins Node to the version required by `engines.node` and runs stronger checks.
- [ ] Web client URL handling is consistent, and the web tests reflect the real proxy setup.
- [ ] `TaskStatus` is defined once and imported everywhere the status union is used.
- [ ] Dead domain helpers (`isPending`, `isCompleted`) are removed or actually used.
- [ ] Domain module is imported with named imports, not the `Task.*` namespace stutter.
- [ ] HTTP and MCP entry points share a single bootstrap function for repo/service wiring.
- [ ] ESLint ignores generated JS/TS declaration files defensively.

## Non-goals

- Do not add new features (auth, migrations, real-time sync, etc.).
- Do not change the domain model or the SQLite schema.
- Do not rewrite the UI.

## Hints

- Read `AGENTS.md` first; it defines the just/Nix workflow.
- Use `git status` often to make sure generated files are not accidentally committed.
- If you introduce a shared package, remember to add it to the root `workspaces` array and run `npm install` so `package-lock.json` updates.
- Keep the prompt's spirit: minimal, focused, verified.
