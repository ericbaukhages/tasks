import * as Task from '../domain/task.js'

export interface TaskRepository {
  save(task: Task.Task): void
  update(task: Task.Task): void
  getById(id: string): Task.Task | undefined
  list(options?: { status?: 'pending' | 'completed'; includeDeleted?: boolean }): Task.Task[]
}

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`)
  }
}

export class TaskService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly clock: Task.TaskClock = Task.defaultClock,
  ) {}

  createTask(description: string): Task.Task {
    const task = Task.createTask(description, this.clock)
    this.repo.save(task)
    return task
  }

  listTasks(filter?: { status?: 'pending' | 'completed' }): Task.Task[] {
    return this.repo.list({ status: filter?.status, includeDeleted: false })
  }

  getTask(id: string): Task.Task {
    const task = this.repo.getById(id)
    if (!task || task.deletedAt) throw new TaskNotFoundError(id)
    return task
  }

  completeTask(id: string): Task.Task {
    const task = this.getTask(id)
    const completed = Task.completeTask(task, this.clock)
    this.repo.update(completed)
    return completed
  }

  deleteTask(id: string): Task.Task {
    const task = this.getTask(id)
    const deleted = Task.softDelete(task, this.clock)
    this.repo.update(deleted)
    return deleted
  }
}
