import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { TaskService, TaskNotFoundError } from '../application/task-service.js'
import { SqliteTaskRepository } from '../persistence/sqlite-task-repository.js'
import type { Task } from '../domain/task.js'

const taskSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  status: z.enum(['pending', 'completed']),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
})

function formatTask(task: Task) {
  return `Task ${task.id}: ${task.description} (${task.status}) created ${task.createdAt}${
    task.completedAt ? ` completed ${task.completedAt}` : ''
  }`
}

function taskContent(task: Task) {
  return {
    content: [{ type: 'text' as const, text: formatTask(task) }],
    structuredContent: taskSchema.parse(task),
  }
}

function handleError(err: unknown) {
  const message = err instanceof TaskNotFoundError ? err.message : String(err)
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true }
}

export function startMcpServer(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true })

  const repo = new SqliteTaskRepository(dbPath)
  const service = new TaskService(repo)

  const server = new McpServer({ name: 'tasks-mcp-server', version: '0.1.0' })

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task with a description.',
      inputSchema: { description: z.string().trim().min(1) },
      outputSchema: taskSchema,
    },
    async ({ description }) => {
      try {
        const task = service.createTask(description)
        return taskContent(task)
      } catch (err) {
        return handleError(err)
      }
    },
  )

  server.registerTool(
    'list_tasks',
    {
      description: 'List tasks. Defaults to outstanding (pending) tasks.',
      inputSchema: { status: z.enum(['pending', 'completed']).optional() },
      outputSchema: z.object({ tasks: z.array(taskSchema) }),
    },
    async ({ status }) => {
      try {
        const tasks = service.listTasks(status ? { status } : { status: 'pending' })
        const text = tasks.length ? tasks.map(formatTask).join('\n') : 'No tasks found.'
        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: { tasks: tasks.map((t) => taskSchema.parse(t)) },
        }
      } catch (err) {
        return handleError(err)
      }
    },
  )

  server.registerTool(
    'get_task',
    {
      description: 'Get a single task by its ID.',
      inputSchema: { id: z.string().uuid() },
      outputSchema: taskSchema,
    },
    async ({ id }) => {
      try {
        const task = service.getTask(id)
        return taskContent(task)
      } catch (err) {
        return handleError(err)
      }
    },
  )

  server.registerTool(
    'complete_task',
    {
      description: 'Mark a task as completed.',
      inputSchema: { id: z.string().uuid() },
      outputSchema: taskSchema,
    },
    async ({ id }) => {
      try {
        const task = service.completeTask(id)
        return taskContent(task)
      } catch (err) {
        return handleError(err)
      }
    },
  )

  server.registerTool(
    'delete_task',
    {
      description: 'Soft-delete a task by its ID.',
      inputSchema: { id: z.string().uuid() },
      outputSchema: taskSchema,
    },
    async ({ id }) => {
      try {
        const task = service.deleteTask(id)
        return {
          content: [{ type: 'text' as const, text: `Deleted ${formatTask(task)}` }],
          structuredContent: taskSchema.parse(task),
        }
      } catch (err) {
        return handleError(err)
      }
    },
  )

  return { server, repo }
}

const defaultDbPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/tasks.db')

async function main() {
  const dbPath = process.env.DB_PATH ?? defaultDbPath
  const { server, repo } = startMcpServer(dbPath)
  const transport = new StdioServerTransport()

  server.server.onclose = () => repo.close()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
