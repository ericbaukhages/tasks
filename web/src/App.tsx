import { useEffect, useState } from 'react'
import { completeTask, createTask, deleteTask, listTasks } from './api'
import { Task } from './types'

export function App() {
  const [description, setDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      setTasks(await listTasks(filter))
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = description.trim()
    if (!trimmed) return
    try {
      setError(null)
      await createTask(trimmed)
      setDescription('')
      await load()
    } catch (e) {
      setError(String(e))
    }
  }

  const handleComplete = async (id: string) => {
    try {
      setError(null)
      await completeTask(id)
      await load()
    } catch (e) {
      setError(String(e))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      await deleteTask(id)
      await load()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Tasks</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs to be done?"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <button onClick={() => setFilter('pending')} disabled={filter === 'pending'}>
          Outstanding
        </button>
        <button onClick={() => setFilter('completed')} disabled={filter === 'completed'}>
          Completed
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.length === 0 && <li>No {filter} tasks.</li>}
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <span style={{ flex: 1, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
              {task.description}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {task.status === 'pending' && (
                <button onClick={() => handleComplete(task.id)}>Complete</button>
              )}
              <button onClick={() => handleDelete(task.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
