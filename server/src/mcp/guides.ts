export const setupGuide = `# Tasks MCP Server — Setup Guide

Tasks is a personal task manager with a web UI, HTTP API, and an MCP server. This guide explains how to install and configure the MCP server so an AI assistant can manage tasks alongside you.

## Requirements

- Node.js 22.13+ **or** Nix for a reproducible toolchain
- \`just\` (optional, used by the justfile recipes)

## Install and build

1. Clone the repository:

   \`\`\`bash
   git clone https://github.com/ericbaukhages/tasks.git
   cd tasks
   \`\`\`

2. Install dependencies:

   \`\`\`bash
   npm install
   \`\`\`

3. Build the project:

   \`\`\`bash
   npm run build
   \`\`\`

   Or, if you use Nix + just:

   \`\`\`bash
   just build
   \`\`\`

## Configure your MCP client

Add the server to your MCP client configuration (Claude Desktop, Cursor, etc.). Use the absolute path to the built server file:

\`\`\`json
{
  "mcpServers": {
    "tasks": {
      "command": "node",
      "args": ["/absolute/path/to/tasks/server/dist/mcp/server.js"],
      "env": {
        "DB_PATH": "/optional/path/to/tasks.db"
      }
    }
  }
}
\`\`\`

\`DB_PATH\` is optional. When omitted, the database is created at \`server/data/tasks.db\` relative to the server module so the path stays stable regardless of the working directory.

## Available tools

- \`create_task\` — create a task when the user wants to track, remember, or follow up on something.
- \`list_tasks\` — list tasks, optionally filtered by status. Use this to check current workload or find a task ID.
- \`get_task\` — get a single task by ID.
- \`complete_task\` — mark a task as completed.
- \`delete_task\` — soft-delete a task by ID.

## Best practices

- Create a task whenever the user asks to "remember", "track", "follow up", or "don't let me forget" something.
- Before starting multi-step work, list tasks to see the current state.
- Mark tasks complete only after confirming the work is done.
- Use \`delete_task\` only when the user explicitly asks to remove a task.
- Prefer creating tasks over relying on conversation memory.
`

export const usageGuide = `# Tasks MCP Server — Usage Guide

Use these conventions when managing tasks through the Tasks MCP server.

## When to create a task

Create a task when the user:

- asks to remember, track, or follow up on something
- wants a todo, action item, or reminder
- starts a multi-step request that should outlive the current conversation

Examples:

- "Remind me to call Sarah tomorrow" → create_task
- "I need to finish the report by Friday" → create_task
- "Don't let me forget to review this PR" → create_task

## When to list tasks

List tasks before starting work, when the user asks "what do I have to do?", or when you need a task ID.

Use \`status: pending\` to focus on outstanding work. Use \`status: completed\` to review recently finished items.

## When to complete a task

Only mark a task complete after the user confirms the work is done or you can verify it is done. If unsure, ask.

## When to delete a task

Only delete a task when the user explicitly says to remove, cancel, or delete it. Deletion is a soft delete; it removes the task from normal lists but does not erase history.

## Task IDs

Task IDs are opaque strings. Do not invent IDs. Always get IDs from \`list_tasks\` or \`create_task\`.
`
