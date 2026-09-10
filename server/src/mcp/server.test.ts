import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const serverPath = resolve(dirname(fileURLToPath(import.meta.url)), 'server.js')

interface ToolResult {
  content?: Array<{ type: string; text: string }>
  structuredContent?: Record<string, unknown>
  isError?: boolean
  toolResult?: unknown
}

function getText(res: ToolResult): string {
  if ('toolResult' in res) return ''
  const first = res.content?.[0]
  return first?.type === 'text' ? first.text : ''
}

function getStructured(res: ToolResult): Record<string, unknown> | undefined {
  if ('toolResult' in res) return undefined
  return res.structuredContent
}

async function createTestClient() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { ...process.env, DB_PATH: ':memory:' },
  })

  const client = new Client({ name: 'test-client', version: '0.1.0' })
  await client.connect(transport)

  return {
    client,
    async cleanup() {
      await client.close()
    },
  }
}

describe('mcp/server', () => {
  let client: Client
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createTestClient()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('lists tools', async () => {
    const tools = await client.listTools()
    const names = tools.tools.map((t) => t.name)
    assert.deepEqual(names.sort(), ['complete_task', 'create_task', 'delete_task', 'get_task', 'list_tasks'])
  })

  it('creates a task', async () => {
    const res = (await client.callTool({
      name: 'create_task',
      arguments: { description: 'Buy milk' },
    })) as ToolResult
    assert.equal(res.isError, undefined)
    assert.ok(getText(res).includes('Buy milk'))
    const structured = getStructured(res)
    assert.equal(structured?.description, 'Buy milk')
    assert.equal(structured?.status, 'pending')
  })

  it('rejects missing description', async () => {
    const res = (await client.callTool({
      name: 'create_task',
      arguments: {},
    })) as ToolResult
    assert.equal(res.isError, true)
  })

  it('rejects whitespace-only description', async () => {
    const res = (await client.callTool({
      name: 'create_task',
      arguments: { description: '   ' },
    })) as ToolResult
    assert.equal(res.isError, true)
  })

  it('lists pending tasks by default', async () => {
    await client.callTool({ name: 'create_task', arguments: { description: 'A' } })
    await client.callTool({ name: 'create_task', arguments: { description: 'B' } })

    const res = (await client.callTool({ name: 'list_tasks', arguments: {} })) as ToolResult
    assert.equal(res.isError, undefined)
    const text = getText(res)
    assert.ok(text.includes('A'))
    assert.ok(text.includes('B'))
    const structured = getStructured(res)
    assert.equal(Array.isArray(structured?.tasks), true)
    assert.equal((structured?.tasks as unknown[]).length, 2)
  })

  it('filters by status', async () => {
    const created = (await client.callTool({
      name: 'create_task',
      arguments: { description: 'A' },
    })) as ToolResult
    const text = getText(created)
    const match = text.match(/Task ([0-9a-f-]+):/)
    assert.ok(match)
    const id = match[1]

    await client.callTool({ name: 'complete_task', arguments: { id } })

    const pending = (await client.callTool({ name: 'list_tasks', arguments: { status: 'pending' } })) as ToolResult
    const completed = (await client.callTool({ name: 'list_tasks', arguments: { status: 'completed' } })) as ToolResult

    const pendingText = getText(pending)
    const completedText = getText(completed)
    assert.ok(!pendingText.includes('A'))
    assert.ok(completedText.includes('A'))
  })

  it('gets, completes, and deletes a task', async () => {
    const created = (await client.callTool({
      name: 'create_task',
      arguments: { description: 'A' },
    })) as ToolResult
    const text = getText(created)
    const match = text.match(/Task ([0-9a-f-]+):/)
    assert.ok(match)
    const id = match[1]

    const got = (await client.callTool({ name: 'get_task', arguments: { id } })) as ToolResult
    assert.equal(got.isError, undefined)

    const completed = (await client.callTool({ name: 'complete_task', arguments: { id } })) as ToolResult
    const completedText = getText(completed)
    assert.ok(completedText.includes('completed'))

    const deleted = (await client.callTool({ name: 'delete_task', arguments: { id } })) as ToolResult
    assert.equal(deleted.isError, undefined)

    const gone = (await client.callTool({ name: 'get_task', arguments: { id } })) as ToolResult
    assert.equal(gone.isError, true)
  })
})
