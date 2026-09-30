'use client'

import { useEffect, useRef, useState } from 'react'

type Todo = { id: string; text: string; done: boolean }

const STORAGE_KEY = 'dashboard-todos'

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function TodoList() {
  // Lazy initializer is safe here because this component is imported with
  // ssr: false in page.tsx — localStorage is always available on first render.
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  function add() {
    const text = input.trim()
    if (!text) return
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }])
    setInput('')
    inputRef.current?.focus()
  }

  function toggle(id: string) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <section className="w-full">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        Things to remember
      </h2>

      <form
        onSubmit={(e) => { e.preventDefault(); add() }}
        className="mb-4 flex gap-2"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add something…"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add
        </button>
      </form>

      {todos.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-600">Nothing here yet.</p>
      )}

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-3 group">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggle(todo.id)}
              className="h-4 w-4 cursor-pointer accent-zinc-900 dark:accent-zinc-50"
            />
            <span
              className={`flex-1 text-sm ${
                todo.done
                  ? 'text-zinc-400 line-through dark:text-zinc-600'
                  : 'text-zinc-800 dark:text-zinc-200'
              }`}
            >
              {todo.text}
            </span>
            <button
              onClick={() => remove(todo.id)}
              aria-label="Delete"
              className="text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-zinc-600 transition-all dark:text-zinc-700 dark:hover:text-zinc-400"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
