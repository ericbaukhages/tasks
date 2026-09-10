import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startHttpServer } from './api.js'

const defaultDbPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/tasks.db')

const port = Number(process.env.PORT ?? 3000)
const dbPath = process.env.DB_PATH ?? defaultDbPath

mkdirSync(dirname(dbPath), { recursive: true })

startHttpServer({ port, dbPath })
  .then(({ app, repo }) => {
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, async () => {
        await app.close()
        repo.close()
        process.exit(0)
      })
    }
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
