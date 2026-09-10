import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as Task from './task.js'

describe('domain/task', () => {
  it('creates a pending task', () => {
    const task = Task.createTask('Buy milk')
    assert.equal(task.description, 'Buy milk')
    assert.equal(task.status, 'pending')
    assert.ok(task.id)
    assert.ok(task.createdAt)
    assert.equal(task.completedAt, undefined)
  })

  it('completes a task', () => {
    const task = Task.createTask('Buy milk')
    const completed = Task.completeTask(task)
    assert.equal(completed.status, 'completed')
    assert.ok(completed.completedAt)
  })

  it('soft-deletes a task', () => {
    const task = Task.createTask('Buy milk')
    const deleted = Task.softDelete(task)
    assert.ok(deleted.deletedAt)
    assert.equal(deleted.status, 'pending')
  })
})
