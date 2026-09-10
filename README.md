# tasks

MCP-first personal task management.

This is a small TypeScript task-management application with three interfaces:

- **Web UI** (React + Vite)
- **HTTP API** (Fastify)
- **MCP server** (`@modelcontextprotocol/sdk` over stdio)

All interfaces talk to the same application core and SQLite persistence layer.

## Development requirements

- [Nix](https://nixos.org/download/) (recommended) **or** Node.js 22.13+ and npm
- [just](https://github.com/casey/just) (optional, for recipes)

## Setup

With Nix:

```bash
nix develop
npm install
```

Without Nix, make sure you have Node.js 22.13+ (when `node:sqlite` became unflagged), then:

```bash
npm install
```

## Build and test

```bash
just build
just test
```

Or with npm directly:

```bash
npm run build
npm run test
```

## Run the web application

The web app expects the HTTP API on `http://localhost:3000`.

Terminal 1 — start the API:

```bash
just serve
# or: npm run serve
```

Terminal 2 — start the Vite dev server:

```bash
just dev-web
# or: npm run dev --workspace=web
```

Open `http://localhost:5173`.

## Run the MCP server

```bash
just mcp
# or: npm run mcp
```

The server reads and writes the same SQLite database as the HTTP API. When `DB_PATH` is not set, the database is created next to the server module (`server/data/tasks.db`) so the path is stable regardless of which working directory launches the process.

## Connect the MCP server to a client

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector node server/dist/mcp/server.js
```

Then open the Inspector URL and try the `create_task`, `list_tasks`, `complete_task`, and `delete_task` tools.

### Claude Desktop / other clients

Add a server config that runs:

```json
{
  "mcpServers": {
    "tasks": {
      "command": "node",
      "args": ["/path/to/repo/server/dist/mcp/server.js"]
    }
  }
}
```

## Example MCP interaction

User: *Add "Replace the bathroom faucet" to my task list.*

Agent calls:

```json
{
  "name": "create_task",
  "arguments": {
    "description": "Replace the bathroom faucet"
  }
}
```

Server responds with both human-readable text and structured JSON:

```text
Task 8d7c8b7c-...: Replace the bathroom faucet (pending) created 2026-09-09T12:34:56.789Z
```

```json
{
  "id": "8d7c8b7c-...",
  "description": "Replace the bathroom faucet",
  "status": "pending",
  "createdAt": "2026-09-09T12:34:56.789Z"
}
```

The task is now in SQLite and visible in the web UI.

## Architectural overview

```text
                    Web UI  (React + Vite)
                       │
                       ▼
                  HTTP API  (Fastify)
                       │
                       ▼
               Application Core  (TaskService)
                  │         │
                  ▼         ▼
                Domain    Persistence  (SQLite via node:sqlite)
                            │
                            ▼
                          SQLite

              MCP Server  (stdio)
                       │
                       ▼
               Application Core  (same TaskService)
```

Responsibilities:

- **Domain** (`server/src/domain/task.ts`): task shape, statuses, and pure state transitions.
- **Application** (`server/src/application/task-service.ts`): use-case orchestration; repository interface.
- **Persistence** (`server/src/persistence/sqlite-task-repository.ts`): SQLite implementation of the repository interface using Node.js's built-in `node:sqlite`.
- **HTTP interface** (`server/src/http/`): Fastify routes that validate input and delegate to the service.
- **MCP interface** (`server/src/mcp/`): stdio MCP server that exposes meaningful tools and delegates to the service.
- **Web interface** (`web/src/`): React UI that calls the HTTP API.

The HTTP and MCP interfaces never touch the database directly.

## Significant technical decisions

- **No ORM, built-in SQLite.** Node.js's experimental `node:sqlite` handles persistence, so there is no native module to compile and no ORM abstraction.
- **Soft deletes.** `docs/user-actions.md` requested soft deletes, so tasks get a `deleted_at` timestamp instead of being removed.
- **Shared core, separate interfaces.** Both HTTP and MCP use the same `TaskService`, so behavior stays consistent whether a human or an agent is driving.
- **stdio MCP transport.** Easy to test with the MCP Inspector and avoids port/CORS concerns.
- **Minimal frontend.** The UI is intentionally plain: create, complete, delete, and toggle between outstanding and completed tasks.
- **Validation at the boundary.** `zod` validates HTTP and MCP inputs before they reach the application core, and validates MCP tool outputs before they are returned to clients.
- **Structured MCP responses.** MCP tools declare output schemas and return both readable text and `structuredContent`, so agents can act on IDs and statuses without parsing prose.

## Bonus considerations (not implemented)

A few natural extensions and how they might fit:

- **Priorities / due dates / tags:** add columns to `tasks` and extend the domain types; keep validation in the HTTP/MCP boundary.
- **Projects or lists:** introduce a `projects` table and a foreign key from `tasks`.
- **Recurring tasks:** store recurrence rules on `tasks` and add a scheduled job that spawns the next instance.
- **Task dependencies:** add a `task_dependencies` join table and reject completion cycles in the application service.
- **Natural-language capture:** an MCP tool that parses free text into description + due date + tags before creating the task.
- **CLI:** a small `bin/tasks.ts` script that reuses `TaskService`.
- **Import/export:** add an MCP tool or HTTP endpoint that streams JSON/CSV through the service.

## Final question: what would you keep, change, and leave alone?

If this became the foundation for a broader personal productivity system:

- **Keep:** the clean separation between domain, application, persistence, and interfaces. It is the main reason the system can grow without turning into a monolithic tangle.
- **Change:** move from a single SQLite file to a migration-managed schema (e.g., `node-pg-migrate` or `drizzle-kit` migrations) once multi-user or sync requirements appear. Add authentication and per-user data isolation.
- **Leave alone:** the MCP-first philosophy. Expose meaningful, task-oriented tools rather than generic database operations; that is the property that makes the system pleasant for both humans and agents.

## AI usage

AI-assisted development is encouraged for this MCP-first project. Attribution is included in commit messages that contain AI-generated or -assisted content. See [AGENTS.md](./AGENTS.md).
