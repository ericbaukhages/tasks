import { defaultDbPath } from '../config.js'
import { createTaskService } from '../application/bootstrap.js'
import { buildApp } from './api.js'

const port = Number(process.env.PORT ?? 3000)
const dbPath = process.env.DB_PATH ?? defaultDbPath()

const { service, repo } = createTaskService(dbPath)
const app = await buildApp(service, { logger: true })

await app.listen({ port, host: '127.0.0.1' })

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close()
    repo.close()
    process.exit(0)
  })
}
