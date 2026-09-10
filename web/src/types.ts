export type TaskStatus = 'pending' | 'completed'

export interface Task {
  id: string
  description: string
  status: TaskStatus
  createdAt: string
  completedAt?: string
}
