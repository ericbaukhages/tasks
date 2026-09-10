import { z } from 'zod'

export const TASK_STATUSES = ['pending', 'completed'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const taskStatusSchema = z.enum(TASK_STATUSES)

export const taskSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  status: taskStatusSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
})

export type Task = z.infer<typeof taskSchema>
