import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as Task from './task.js'

const fixedClock: Task.TaskClock = {
  uuid: () => '00000000-0000-0000-0000-000000000000',
  now: () => '2026-09-10T12:00:00.000Z',
}

describe('domain/task', () => {
  it('creates a pending task', () => {
    const task = Task.createTask('Buy milk', fixedClock)
    assert.equal(task.description, 'Buy milk')
    assert.equal(task.status, 'pending')
    assert.equal(task.id, fixedClock.uuid())
    assert.equal(task.createdAt, fixedClock.now())
    assert.equal(task.completedAt, undefined)
  })

  it('trims description', () => {
    const task = Task.createTask('  Buy milk  ', fixedClock)
    assert.equal(task.description, 'Buy milk')
  })

  it('completes a task', () => {
    const task = Task.createTask('Buy milk', fixedClock)
    const completed = Task.completeTask(task, fixedClock)
    assert.equal(completed.status, 'completed')
    assert.equal(completed.completedAt, fixedClock.now())
  })

  it('completing an already completed task is idempotent', () => {
    const task = Task.createTask('Buy milk', fixedClock)
    const completed = Task.completeTask(task, fixedClock)
    const again = Task.completeTask(completed, {
      ...fixedClock,
      now: () => '2026-09-11T12:00:00.000Z',
    })
    assert.equal(again.completedAt, completed.completedAt)
  })

  it('soft-deletes a task', () => {
    const task = Task.createTask('Buy milk', fixedClock)
    const deleted = Task.softDelete(task, fixedClock)
    assert.equal(deleted.deletedAt, fixedClock.now())
    assert.equal(deleted.status, 'pending')
  })

  it('deleting an already deleted task is idempotent', () => {
    const task = Task.createTask('Buy milk', fixedClock)
    const deleted = Task.softDelete(task, fixedClock)
    const again = Task.softDelete(deleted, { ...fixedClock, now: () => '2026-09-11T12:00:00.000Z' })
    assert.equal(again.deletedAt, deleted.deletedAt)
  })
})
