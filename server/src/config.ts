import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function defaultDbPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../data/tasks.db')
}

export function ensureDbDirectory(path: string): void {
  mkdirSync(dirname(path), { recursive: true })
}
