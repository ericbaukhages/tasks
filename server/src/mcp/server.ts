import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { taskSchema, taskStatusSchema } from '@tasks/types'
import type { Task } from '@tasks/types'
import { mapErrorToStatus } from '../application/errors.js'
import { descriptionSchema, taskIdParamSchema } from '../application/validation.js'
import { createTaskService } from '../application/bootstrap.js'
import { defaultDbPath } from '../config.js'

function formatTask(task: Task) {
  return `Task ${task.id}: ${task.description} (${task.status}) created ${task.createdAt}${
    task.completedAt ? ` completed ${task.completedAt}` : ''
  }`
}

function textItem(text: string): { type: 'text'; text: string } {
  return { type: 'text', text }
}

function taskContent(task: Task) {
  return {
    content: [textItem(formatTask(task))],
    structuredContent: taskSchema.parse(task),
  }
}

function handleError(err: unknown) {
  const { message } = mapErrorToStatus(err)
  return { content: [textItem(`Error: ${message}`)], isError: true }
}

const packageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
})

function readPackageJson() {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json')
  const contents = readFileSync(path, 'utf-8')
  return packageJsonSchema.parse(JSON.parse(contents))
}

export function startMcpServer(dbPath: string) {
  const { repo, service } = createTaskService(dbPath)

  const pkg = readPackageJson()
  const server = new McpServer({ name: pkg.name, version: pkg.version })

  server.registerTool(
    'create_task',
    {
      description: 'Create a new task with a description.',
      inputSchema: { description: descriptionSchema },
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
      description: 'List tasks. Defaults to all non-deleted tasks.',
      inputSchema: { status: taskStatusSchema.optional() },
      outputSchema: z.object({ tasks: z.array(taskSchema) }),
    },
    async ({ status }) => {
      try {
        const tasks = service.listTasks(status ? { status } : undefined)
        const text = tasks.length ? tasks.map(formatTask).join('\n') : 'No tasks found.'
        return {
          content: [textItem(text)],
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
      inputSchema: taskIdParamSchema.shape,
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
      inputSchema: taskIdParamSchema.shape,
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
      inputSchema: taskIdParamSchema.shape,
      outputSchema: taskSchema,
    },
    async ({ id }) => {
      try {
        const task = service.deleteTask(id)
        return {
          content: [textItem(`Deleted ${formatTask(task)}`)],
          structuredContent: taskSchema.parse(task),
        }
      } catch (err) {
        return handleError(err)
      }
    },
  )

  return { server, repo }
}

async function main() {
  const dbPath = process.env.DB_PATH ?? defaultDbPath()
  const { server, repo } = startMcpServer(dbPath)
  const transport = new StdioServerTransport()

  server.server.onclose = () => repo.close()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
