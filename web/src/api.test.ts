import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type { Task } from '@tasks/types'
import { listTasks, getTask, createTask, completeTask, deleteTask } from './api.js'

describe('web/api', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    Reflect.set(globalThis, 'fetch', originalFetch)
  })

  function mockFetch(response: Partial<Response> & { data?: unknown }) {
    const status = response.status ?? (response.ok === false ? 500 : 200)
    const body = response.data !== undefined ? JSON.stringify(response.data) : null
    globalThis.fetch = async () => new Response(body, { status })
  }

  it('lists tasks with status filter', async () => {
    const tasks: Task[] = [
      { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' },
    ]
    mockFetch({ ok: true, data: tasks })

    const result = await listTasks('pending')
    assert.deepEqual(result, tasks)
  })

  it('gets a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }
    mockFetch({ ok: true, data: task })

    const result = await getTask('1')
    assert.deepEqual(result, task)
  })

  it('creates a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }
    mockFetch({ ok: true, data: task })

    const result = await createTask('A')
    assert.deepEqual(result, task)
  })

  it('completes a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'completed', createdAt: '2026-01-01' }
    mockFetch({ ok: true, data: task })

    const result = await completeTask('1')
    assert.deepEqual(result, task)
  })

  it('deletes a task', async () => {
    const task: Task = { id: '1', description: 'A', status: 'pending', createdAt: '2026-01-01' }
    mockFetch({ ok: true, data: task })

    const result = await deleteTask('1')
    assert.deepEqual(result, task)
  })

  it('throws on error response', async () => {
    mockFetch({ ok: false, data: 'Not found' })

    await assert.rejects(() => getTask('1'), /Not found/)
  })
})
