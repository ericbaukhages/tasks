import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { TaskService, TaskNotFoundError } from '../application/task-service.js'
import { SqliteTaskRepository } from '../persistence/sqlite-task-repository.js'

const TOOLS: Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task with a description.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What needs to be done' },
      },
      required: ['description'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks. Defaults to outstanding tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'completed'],
          description: 'Filter by status',
        },
      },
    },
  },
  {
    name: 'get_task',
    description: 'Get a single task by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Soft-delete a task by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
      },
      required: ['id'],
    },
  },
]

function formatTask(task: { id: string; description: string; status: string; createdAt: string; completedAt?: string }) {
  return `Task ${task.id}: ${task.description} (${task.status}) created ${task.createdAt}${
    task.completedAt ? ` completed ${task.completedAt}` : ''
  }`
}

function startMcpServer(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true })

  const repo = new SqliteTaskRepository(dbPath)
  const service = new TaskService(repo)

  const server = new Server(
    { name: 'tasks-mcp-server', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      if (name === 'create_task') {
        const description = String((args as Record<string, unknown>).description)
        const task = service.createTask(description)
        return { content: [{ type: 'text', text: formatTask(task) }] }
      }

      if (name === 'list_tasks') {
        const status = (args as Record<string, unknown>).status as 'pending' | 'completed' | undefined
        const tasks = service.listTasks(status ? { status } : undefined)
        const text = tasks.length ? tasks.map(formatTask).join('\n') : 'No tasks found.'
        return { content: [{ type: 'text', text }] }
      }

      if (name === 'get_task') {
        const id = String((args as Record<string, unknown>).id)
        const task = service.getTask(id)
        return { content: [{ type: 'text', text: formatTask(task) }] }
      }

      if (name === 'complete_task') {
        const id = String((args as Record<string, unknown>).id)
        const task = service.completeTask(id)
        return { content: [{ type: 'text', text: formatTask(task) }] }
      }

      if (name === 'delete_task') {
        const id = String((args as Record<string, unknown>).id)
        const task = service.deleteTask(id)
        return { content: [{ type: 'text', text: `Deleted ${formatTask(task)}` }] }
      }

      throw new Error(`Unknown tool: ${name}`)
    } catch (err) {
      const message = err instanceof TaskNotFoundError ? err.message : String(err)
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
    }
  })

  return { server, repo }
}

async function main() {
  const dbPath = process.env.DB_PATH ?? './data/tasks.db'
  const { server, repo } = startMcpServer(dbPath)
  const transport = new StdioServerTransport()

  server.onclose = () => repo.close()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
