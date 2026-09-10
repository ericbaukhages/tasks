import Fastify, { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TaskService, TaskNotFoundError } from '../application/task-service.js'
import { SqliteTaskRepository } from '../persistence/sqlite-task-repository.js'

export async function registerRoutes(app: FastifyInstance, service: TaskService) {
  app.get('/tasks', async (request) => {
    const query = z
      .object({ status: z.enum(['pending', 'completed']).optional() })
      .parse(request.query)
    return service.listTasks(query.status ? { status: query.status } : undefined)
  })

  app.get('/tasks/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    return service.getTask(id)
  })

  app.post('/tasks', async (request) => {
    const body = z
      .object({ description: z.string().trim().min(1) })
      .parse(request.body)
    return service.createTask(body.description)
  })

  app.post('/tasks/:id/complete', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    return service.completeTask(id)
  })

  app.delete('/tasks/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    return service.deleteTask(id)
  })
}

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      })
    }
    if (error instanceof TaskNotFoundError) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      })
    }
    const message = error instanceof Error ? error.message : String(error)
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message,
    })
  })
}

export async function buildApp(service: TaskService, options?: { logger?: boolean }) {
  const app = Fastify({ logger: options?.logger ?? false })
  setupErrorHandler(app)
  await registerRoutes(app, service)
  return app
}

export async function startHttpServer(args: { port: number; dbPath: string }) {
  const repo = new SqliteTaskRepository(args.dbPath)
  const service = new TaskService(repo)
  const app = await buildApp(service, { logger: true })

  await app.listen({ port: args.port, host: '127.0.0.1' })
  return { app, service, repo }
}
