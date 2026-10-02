'use client'

import { useState } from 'react'

type Note = { filename: string; contentHash: string; status: 'new' | 'changed' | 'processed' }
type ProcessResult = { processed: number; created: number; updated: number }

const statusConfig: Record<Note['status'], { label: string; className: string }> = {
  new: {
    label: 'new',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  changed: {
    label: 'changed',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  processed: {
    label: 'processed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
}

export default function ProcessingPage() {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function scan() {
    setScanning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? res.statusText)
      }
      const data = await res.json()
      setNotes(data.notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setScanning(false)
    }
  }

  async function processNotes(reprocessAll: boolean) {
    setProcessing(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reprocessAll }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? res.statusText)
      }
      const data = await res.json()
      setResult(data)
      await scan()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProcessing(false)
    }
  }

  const pendingCount = notes?.filter((n) => n.status !== 'processed').length ?? 0

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-1 flex-col gap-6 w-full max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Processing files
        </h1>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={scan}
            disabled={scanning || processing}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {scanning ? 'Scanning…' : 'Scan folder'}
          </button>

          {notes !== null && pendingCount > 0 && (
            <button
              onClick={() => processNotes(false)}
              disabled={processing}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {processing
                ? 'Processing…'
                : `Process ${pendingCount} note${pendingCount !== 1 ? 's' : ''}`}
            </button>
          )}

          {notes !== null && (
            <button
              onClick={() => processNotes(true)}
              disabled={processing}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Reprocess all
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {result && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Processed {result.processed} note{result.processed !== 1 ? 's' : ''} —{' '}
            {result.created} created, {result.updated} updated.
          </p>
        )}

        {notes !== null && (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {notes.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-400">No notes found in folder.</li>
            ) : (
              notes.map((note) => {
                const cfg = statusConfig[note.status]
                return (
                  <li key={note.filename} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-zinc-800 dark:text-zinc-200">
                      {note.filename}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
                    >
                      {cfg.label}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        )}
      </main>
    </div>
  )
}
