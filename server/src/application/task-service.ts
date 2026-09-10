import {
  Task,
  TaskClock,
  TaskStatus,
  completeTask,
  createTask,
  defaultClock,
  softDelete,
} from '../domain/task.js'

export interface TaskRepository {
  save(task: Task): void
  update(task: Task): void
  getById(id: string): Task | undefined
  list(options?: { status?: TaskStatus; includeDeleted?: boolean }): Task[]
}

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`)
  }
}

export class TaskService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly clock: TaskClock = defaultClock,
  ) {}

  createTask(description: string): Task {
    const task = createTask(description, this.clock)
    this.repo.save(task)
    return task
  }

  listTasks(filter?: { status?: TaskStatus }): Task[] {
    return this.repo.list({ status: filter?.status, includeDeleted: false })
  }

  getTask(id: string): Task {
    const task = this.repo.getById(id)
    if (!task || task.deletedAt) throw new TaskNotFoundError(id)
    return task
  }

  completeTask(id: string): Task {
    const task = this.getTask(id)
    const completed = completeTask(task, this.clock)
    this.repo.update(completed)
    return completed
  }

  deleteTask(id: string): Task {
    const task = this.getTask(id)
    const deleted = softDelete(task, this.clock)
    this.repo.update(deleted)
    return deleted
  }
}
