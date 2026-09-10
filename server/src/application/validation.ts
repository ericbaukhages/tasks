import { z } from 'zod'
import { taskStatusSchema } from '@tasks/types'

export const descriptionSchema = z.string().trim().min(1)

export const taskQuerySchema = z.object({
  status: taskStatusSchema.optional(),
})

export const taskIdParamSchema = z.object({
  id: z.string().uuid(),
})
