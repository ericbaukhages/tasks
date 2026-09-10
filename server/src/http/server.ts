import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { startHttpServer } from './api.js'

const port = Number(process.env.PORT ?? 3000)
const dbPath = process.env.DB_PATH ?? './data/tasks.db'

mkdirSync(dirname(dbPath), { recursive: true })

startHttpServer({ port, dbPath }).catch((err) => {
  console.error(err)
  process.exit(1)
})
