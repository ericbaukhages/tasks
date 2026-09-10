import { DatabaseSync } from 'node:sqlite'
import { TaskRepository } from '../application/task-service.js'
import type { Task } from '../domain/task.js'

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

interface TaskRow {
  id: string
  description: string
  status: string
  created_at: string
  completed_at: string | null
  deleted_at: string | null
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    description: row.description,
    status: row.status as Task['status'],
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
    const row = this.getByIdStmt.get(id) as unknown as TaskRow | undefined
    return row ? rowToTask(row) : undefined
  }

  list(options?: { status?: 'pending' | 'completed'; includeDeleted?: boolean }): Task[] {
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
    const rows = stmt.all(...params) as unknown as TaskRow[]

    return rows.map(rowToTask)
  }

  close(): void {
    this.db.close()
  }
}
