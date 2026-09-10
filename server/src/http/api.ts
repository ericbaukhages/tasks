import Fastify, { type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TaskService } from '../application/task-service.js'
import { mapErrorToStatus } from '../application/errors.js'
import { descriptionSchema, taskIdParamSchema, taskQuerySchema } from '../application/validation.js'

export async function registerRoutes(app: FastifyInstance, service: TaskService) {
  await app.register(
    async function apiRoutes(api) {
      api.get('/tasks', async (request) => {
        const query = taskQuerySchema.parse(request.query)
        return service.listTasks(query.status ? { status: query.status } : undefined)
      })

      api.get('/tasks/:id', async (request) => {
        const { id } = taskIdParamSchema.parse(request.params)
        return service.getTask(id)
      })

      api.post('/tasks', async (request) => {
        const body = z.object({ description: descriptionSchema }).parse(request.body)
        return service.createTask(body.description)
      })

      api.post('/tasks/:id/complete', async (request) => {
        const { id } = taskIdParamSchema.parse(request.params)
        return service.completeTask(id)
      })

      api.delete('/tasks/:id', async (request) => {
        const { id } = taskIdParamSchema.parse(request.params)
        return service.deleteTask(id)
      })
    },
    { prefix: '/api' },
  )
}

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    const { status, message } = mapErrorToStatus(error)
    return reply.status(status).send({
      statusCode: status,
      error:
        status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : 'Internal Server Error',
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
