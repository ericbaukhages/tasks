import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { TaskService, TaskNotFoundError } from '../application/task-service.js'
import { SqliteTaskRepository } from '../persistence/sqlite-task-repository.js'

describe('application/TaskService', () => {
  let service: TaskService

  beforeEach(() => {
    const repo = new SqliteTaskRepository()
    service = new TaskService(repo)
  })

  it('creates and lists pending tasks', () => {
    service.createTask('A')
    service.createTask('B')
    const pending = service.listTasks({ status: 'pending' })
    assert.equal(pending.length, 2)
  })

  it('completes a task', () => {
    const task = service.createTask('A')
    const completed = service.completeTask(task.id)
    assert.equal(completed.status, 'completed')
    assert.equal(service.listTasks({ status: 'pending' }).length, 0)
    assert.equal(service.listTasks({ status: 'completed' }).length, 1)
  })

  it('soft-deletes a task', () => {
    const task = service.createTask('A')
    service.deleteTask(task.id)
    assert.equal(service.listTasks().length, 0)
    assert.throws(() => service.getTask(task.id), TaskNotFoundError)
  })
})
