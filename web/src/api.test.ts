import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { listTasks, getTask, createTask, completeTask, deleteTask } from './api.js'
import type { Task } from './types.js'

describe('web/api', () => {
  const originalFetch = globalThis.fetch
  const originalWindow = (globalThis as { window?: unknown }).window

  beforeEach(() => {
    ;(globalThis as { window: unknown }).window = {
      location: { origin: 'http://localhost:3000' },
    }
  })

  afterEach(() => {
    ;(globalThis as { fetch: typeof fetch }).fetch = originalFetch
    ;(globalThis as { window?: unknown }).window = originalWindow
  })

  function mockFetch(response: Partial<Response>) {
    globalThis.fetch = (async () => response as Response) as typeof fetch
  }

  it('lists tasks with status filter', async () => {
    const tasks: Task[] = [{ id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }]
    mockFetch({ ok: true, json: async () => tasks })

    const result = await listTasks('pending')
    assert.deepEqual(result, tasks)
  })

  it('gets a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }
    mockFetch({ ok: true, json: async () => task })

    const result = await getTask('1')
    assert.deepEqual(result, task)
  })

  it('creates a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }
    mockFetch({ ok: true, json: async () => task })

    const result = await createTask('A')
    assert.deepEqual(result, task)
  })

  it('completes a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'completed', createdAt: '2026-01-01' }
    mockFetch({ ok: true, json: async () => task })

    const result = await completeTask('1')
    assert.deepEqual(result, task)
  })

  it('deletes a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }
    mockFetch({ ok: true, json: async () => task })

    const result = await deleteTask('1')
    assert.deepEqual(result, task)
  })

  it('throws on error response', async () => {
    mockFetch({ ok: false, text: async () => 'Not found' })

    await assert.rejects(() => getTask('1'), /Not found/)
  })
})
