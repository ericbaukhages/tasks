import { ensureDbDirectory } from '../config.js'
import { TaskService } from './task-service.js'
import { SqliteTaskRepository } from '../persistence/sqlite-task-repository.js'

export function createTaskService(dbPath: string) {
  ensureDbDirectory(dbPath)
  const repo = new SqliteTaskRepository(dbPath)
  const service = new TaskService(repo)
  return { repo, service }
}
