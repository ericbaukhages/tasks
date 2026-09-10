export type TaskStatus = 'pending' | 'completed'

export interface Task {
  id: string
  description: string
  status: TaskStatus
  createdAt: string
  completedAt?: string
  deletedAt?: string
}

import { randomUUID } from 'node:crypto'

export function createTask(description: string): Task {
  return {
    id: randomUUID(),
    description: description.trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export function completeTask(task: Task): Task {
  if (task.status === 'completed') return task
  return {
    ...task,
    status: 'completed',
    completedAt: new Date().toISOString(),
  }
}

export function softDelete(task: Task): Task {
  if (task.deletedAt) return task
  return {
    ...task,
    deletedAt: new Date().toISOString(),
  }
}

export function isPending(task: Task): boolean {
  return task.status === 'pending' && !task.deletedAt
}

export function isCompleted(task: Task): boolean {
  return task.status === 'completed' && !task.deletedAt
}
