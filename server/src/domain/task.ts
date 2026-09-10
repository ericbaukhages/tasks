import { randomUUID } from 'node:crypto'
import type { Task, TaskStatus } from '@tasks/types'

export type { Task, TaskStatus }

export interface TaskClock {
  uuid(): string
  now(): string
}

export const defaultClock: TaskClock = {
  uuid: () => randomUUID(),
  now: () => new Date().toISOString(),
}

export function createTask(description: string, clock: TaskClock = defaultClock): Task {
  return {
    id: clock.uuid(),
    description: description.trim(),
    status: 'pending',
    createdAt: clock.now(),
  }
}

export function completeTask(task: Task, clock: TaskClock = defaultClock): Task {
  if (task.status === 'completed') return task
  return {
    ...task,
    status: 'completed',
    completedAt: clock.now(),
  }
}

export function softDelete(task: Task, clock: TaskClock = defaultClock): Task {
  if (task.deletedAt) return task
  return {
    ...task,
    deletedAt: clock.now(),
  }
}
