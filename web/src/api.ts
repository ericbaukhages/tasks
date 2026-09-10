import { Task } from './types.js'

const API = '/api'

export async function listTasks(status?: 'pending' | 'completed'): Promise<Task[]> {
  const url = new URL(`${API}/tasks`, window.location.origin)
  if (status) url.searchParams.set('status', status)
  const res = await fetch(url)
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
