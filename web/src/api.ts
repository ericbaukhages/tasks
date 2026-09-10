import { Task, TaskStatus } from '@tasks/types'

const API = '/api'

export async function listTasks(status?: TaskStatus): Promise<Task[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const query = params.toString()
  const res = await fetch(`${API}/tasks${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getTask(id: string): Promise<Task> {
  const res = await fetch(`${API}/tasks/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createTask(description: string): Promise<Task> {
  const res = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function completeTask(id: string): Promise<Task> {
  const res = await fetch(`${API}/tasks/${id}/complete`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteTask(id: string): Promise<Task> {
  const res = await fetch(`${API}/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
