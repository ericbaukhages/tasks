import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
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

function assertToolResult(value: unknown): asserts value is ToolResult {
  if (value === null || typeof value !== 'object') {
    throw new Error('Expected ToolResult object')
  }
  if (!(
    'content' in value ||
    'structuredContent' in value ||
    'isError' in value ||
    'toolResult' in value
  )) {
    throw new Error('Expected ToolResult shape')
  }
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

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const res = await client.callTool({ name, arguments: args })
  assertToolResult(res)
  return res
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
    assert.deepEqual(names.sort(), [
      'complete_task',
      'create_task',
      'delete_task',
      'get_task',
      'list_tasks',
    ])
  })

  it('creates a task', async () => {
    const res = await callTool(client, 'create_task', { description: 'Buy milk' })
    assert.equal(res.isError, undefined)
    assert.ok(getText(res).includes('Buy milk'))
    const structured = getStructured(res)
    assert.equal(structured?.description, 'Buy milk')
    assert.equal(structured?.status, 'pending')
  })

  it('rejects missing description', async () => {
    const res = await callTool(client, 'create_task', {})
    assert.equal(res.isError, true)
  })

  it('rejects whitespace-only description', async () => {
    const res = await callTool(client, 'create_task', { description: '   ' })
    assert.equal(res.isError, true)
  })

  it('lists tasks by default', async () => {
    await callTool(client, 'create_task', { description: 'A' })
    await callTool(client, 'create_task', { description: 'B' })

    const res = await callTool(client, 'list_tasks', {})
    assert.equal(res.isError, undefined)
    const text = getText(res)
    assert.ok(text.includes('A'))
    assert.ok(text.includes('B'))
    const structured = getStructured(res)
    const tasks = structured?.tasks
    assert.equal(Array.isArray(tasks), true)
    if (Array.isArray(tasks)) {
      assert.equal(tasks.length, 2)
    }
  })

  function getTaskId(res: ToolResult): string {
    const structured = getStructured(res)
    assert.ok(structured && typeof structured === 'object')
    assert.ok('id' in structured && typeof structured.id === 'string')
    return structured.id
  }

  it('filters by status', async () => {
    const created = await callTool(client, 'create_task', { description: 'A' })
    const id = getTaskId(created)

    await callTool(client, 'complete_task', { id })

    const pending = await callTool(client, 'list_tasks', { status: 'pending' })
    const completed = await callTool(client, 'list_tasks', { status: 'completed' })

    const pendingText = getText(pending)
    const completedText = getText(completed)
    assert.ok(!pendingText.includes('A'))
    assert.ok(completedText.includes('A'))
  })

  it('gets, completes, and deletes a task', async () => {
    const created = await callTool(client, 'create_task', { description: 'A' })
    const id = getTaskId(created)

    const got = await callTool(client, 'get_task', { id })
    assert.equal(got.isError, undefined)

    const completed = await callTool(client, 'complete_task', { id })
    const completedText = getText(completed)
    assert.ok(completedText.includes('completed'))

    const deleted = await callTool(client, 'delete_task', { id })
    assert.equal(deleted.isError, undefined)

    const gone = await callTool(client, 'get_task', { id })
    assert.equal(gone.isError, true)
  })
})
