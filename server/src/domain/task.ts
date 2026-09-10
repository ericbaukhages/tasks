import { randomUUID } from 'node:crypto'

export type TaskStatus = 'pending' | 'completed'

export interface Task {
  id: string
  description: string
  status: TaskStatus
  createdAt: string
  completedAt?: string
  deletedAt?: string
}

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

export function isPending(task: Task): boolean {
  return task.status === 'pending' && !task.deletedAt
}

export function isCompleted(task: Task): boolean {
  return task.status === 'completed' && !task.deletedAt
}
