import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { kbDir } from './kb'

export type Note = {
  filename: string
  contentHash: string
  status: 'new' | 'changed' | 'processed'
}

export type ProcessedEntry = {
  path: string
  contentHash: string
  processedAt: string
  skillFiles: string[]
}

function resolveNotesDir(): string {
  const raw = process.env.NOTES_DIR ?? '~/notes'
  return raw.startsWith('~') ? path.join(os.homedir(), raw.slice(2)) : raw
}

function processedPath(): string {
  return path.join(kbDir(), 'processed.json')
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
}

export async function getProcessed(): Promise<ProcessedEntry[]> {
  try {
    const data = await fs.readFile(processedPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function saveProcessed(entries: ProcessedEntry[]): Promise<void> {
  await fs.mkdir(kbDir(), { recursive: true })
  await fs.writeFile(processedPath(), JSON.stringify(entries, null, 2))
}

export async function listNotes(): Promise<Note[]> {
  const dir = resolveNotesDir()

  let files: string[]
  try {
    const entries = await fs.readdir(dir)
    files = entries.filter((f) => f.endsWith('.md') || f.endsWith('.txt'))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Notes folder not found: ${dir}. Create it or update NOTES_DIR in .env.local.`
      )
    }
    throw err
  }

  const processed = await getProcessed()
  const processedMap = new Map(processed.map((e) => [e.path, e]))

  const notes = await Promise.all(
    files.map(async (filename) => {
      const content = await fs.readFile(path.join(dir, filename), 'utf-8')
      const contentHash = hashContent(content)
      const existing = processedMap.get(filename)

      let status: Note['status']
      if (!existing) status = 'new'
      else if (existing.contentHash !== contentHash) status = 'changed'
      else status = 'processed'

      return { filename, contentHash, status }
    })
  )

  return notes.sort((a, b) => a.filename.localeCompare(b.filename))
}

export async function getNoteContent(filename: string): Promise<string> {
  const dir = resolveNotesDir()
  return fs.readFile(path.join(dir, filename), 'utf-8')
}
