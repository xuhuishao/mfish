'use client'

import { useRef, useState } from 'react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function sendMessage() {
    const question = input.trim()
    if (!question || loading) return
    setInput('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: question }
    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '' }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, text: `Error: ${errText}` } : m
          )
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(part.slice(6))
            if (typeof evt.text === 'string') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: m.text + evt.text } : m
                )
              )
            }
            if (evt.done && Array.isArray(evt.sources)) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: evt.sources } : m
                )
              )
            }
          } catch {
            // skip malformed SSE event
          }
        }
      }
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-1 flex-col w-full max-w-2xl mx-auto px-6 py-16 gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Chat
        </h1>

        <div className="flex flex-1 flex-col gap-4">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              Ask anything about your notes.
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`rounded-xl px-4 py-3 text-sm max-w-prose whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                    : 'bg-white text-zinc-800 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700'
                }`}
              >
                {msg.text || (loading && msg.role === 'assistant' ? '…' : '')}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <p className="text-xs text-zinc-400 dark:text-zinc-600 px-1">
                  Sources: {msg.sources.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your notes…"
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-600 dark:focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  )
}
