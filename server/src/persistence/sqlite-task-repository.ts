import { DatabaseSync } from 'node:sqlite'
import { z } from 'zod'
import { taskStatusSchema } from '@tasks/types'
import { TaskRepository } from '../application/task-service.js'
import type { Task, TaskStatus } from '../domain/task.js'

const taskRowSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: taskStatusSchema,
  created_at: z.string(),
  completed_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
})

type TaskRow = z.infer<typeof taskRowSchema>

const MIGRATION = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT
);
`

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  }
}

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: DatabaseSync
  private readonly insertStmt: ReturnType<DatabaseSync['prepare']>
  private readonly updateStmt: ReturnType<DatabaseSync['prepare']>
  private readonly getByIdStmt: ReturnType<DatabaseSync['prepare']>

  constructor(path: string = ':memory:') {
    this.db = new DatabaseSync(path)
    this.db.exec(MIGRATION)
    this.db.exec('PRAGMA journal_mode = WAL')

    this.insertStmt = this.db.prepare(`
      INSERT INTO tasks (id, description, status, created_at, completed_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    this.updateStmt = this.db.prepare(`
      UPDATE tasks
      SET description = ?, status = ?, created_at = ?, completed_at = ?, deleted_at = ?
      WHERE id = ?
    `)

    this.getByIdStmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?')
  }

  save(task: Task): void {
    this.insertStmt.run(
      task.id,
      task.description,
      task.status,
      task.createdAt,
      task.completedAt ?? null,
      task.deletedAt ?? null,
    )
  }

  update(task: Task): void {
    this.updateStmt.run(
      task.description,
      task.status,
      task.createdAt,
      task.completedAt ?? null,
      task.deletedAt ?? null,
      task.id,
    )
  }

  getById(id: string): Task | undefined {
    const raw = this.getByIdStmt.get(id)
    if (!raw) return undefined
    const row = taskRowSchema.parse(raw)
    return rowToTask(row)
  }

  list(options?: { status?: TaskStatus; includeDeleted?: boolean }): Task[] {
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (!options?.includeDeleted) {
      conditions.push('deleted_at IS NULL')
    }

    if (options?.status) {
      conditions.push('status = ?')
      params.push(options.status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const stmt = this.db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC`)
    const rawRows = stmt.all(...params)
    const rows = rawRows.map((raw) => taskRowSchema.parse(raw))

    return rows.map(rowToTask)
  }

  close(): void {
    this.db.close()
  }
}
