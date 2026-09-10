import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from './api.js'
import { TaskService } from '../application/task-service.js'
import { SqliteTaskRepository } from '../persistence/sqlite-task-repository.js'
import type { FastifyInstance } from 'fastify'

describe('http/api', () => {
  let app: FastifyInstance
  let repo: SqliteTaskRepository

  beforeEach(async () => {
    repo = new SqliteTaskRepository()
    const service = new TaskService(repo)
    app = await buildApp(service)
  })

  afterEach(async () => {
    await app.close()
    repo.close()
  })

  it('creates a task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { description: 'Buy milk' },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.payload)
    assert.equal(body.description, 'Buy milk')
    assert.equal(body.status, 'pending')
  })

  it('rejects empty descriptions with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { description: '' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('rejects whitespace-only descriptions with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { description: '   ' },
    })
    assert.equal(res.statusCode, 400)
  })

  it('lists tasks by default', async () => {
    await app.inject({ method: 'POST', url: '/api/tasks', payload: { description: 'A' } })
    await app.inject({ method: 'POST', url: '/api/tasks', payload: { description: 'B' } })

    const res = await app.inject({ method: 'GET', url: '/api/tasks?status=pending' })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.payload)
    assert.equal(body.length, 2)
  })

  it('filters tasks by status', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { description: 'A' },
    })
    const { id } = JSON.parse(created.payload)
    await app.inject({ method: 'POST', url: `/api/tasks/${id}/complete` })

    const pending = await app.inject({ method: 'GET', url: '/api/tasks?status=pending' })
    const completed = await app.inject({ method: 'GET', url: '/api/tasks?status=completed' })

    assert.equal(JSON.parse(pending.payload).length, 0)
    assert.equal(JSON.parse(completed.payload).length, 1)
  })

  it('gets a task by id', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { description: 'A' },
    })
    const { id } = JSON.parse(created.payload)

    const res = await app.inject({ method: 'GET', url: `/api/tasks/${id}` })
    assert.equal(res.statusCode, 200)
    assert.equal(JSON.parse(res.payload).description, 'A')
  })

  it('returns 404 for unknown task', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/tasks/00000000-0000-0000-0000-000000000000',
    })
    assert.equal(res.statusCode, 404)
  })

  it('returns 400 for malformed uuid', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tasks/not-a-uuid' })
    assert.equal(res.statusCode, 400)
  })

  it('completes and deletes a task', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { description: 'A' },
    })
    const { id } = JSON.parse(created.payload)

    const completeRes = await app.inject({ method: 'POST', url: `/api/tasks/${id}/complete` })
    assert.equal(completeRes.statusCode, 200)
    assert.equal(JSON.parse(completeRes.payload).status, 'completed')

    const deleteRes = await app.inject({ method: 'DELETE', url: `/api/tasks/${id}` })
    assert.equal(deleteRes.statusCode, 200)

    const getRes = await app.inject({ method: 'GET', url: `/api/tasks/${id}` })
    assert.equal(getRes.statusCode, 404)
  })
})
