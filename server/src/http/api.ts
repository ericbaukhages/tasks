import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import { TaskService } from '../application/task-service.js'
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
    const body = z.object({ description: z.string().min(1) }).parse(request.body)
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

export async function startHttpServer(args: { port: number; dbPath: string }) {
  const repo = new SqliteTaskRepository(args.dbPath)
  const service = new TaskService(repo)
  const app = Fastify({ logger: true })

  void app.register(cors, { origin: true })
  await app.register(async (api) => {
    await registerRoutes(api, service)
  }, { prefix: '/api' })

  await app.listen({ port: args.port, host: '0.0.0.0' })
  return { app, service, repo }
}
