import { z } from 'zod'
import { TaskNotFoundError } from './task-service.js'

export function formatValidationError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
}

export function mapErrorToStatus(error: unknown): { status: number; message: string } {
  if (error instanceof z.ZodError) {
    return { status: 400, message: formatValidationError(error) }
  }
  if (error instanceof TaskNotFoundError) {
    return { status: 404, message: error.message }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { status: 500, message }
}
