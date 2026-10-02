import { extractEntities } from '@/lib/claude'
import {
  appendLog,
  appendSkillFile,
  ensureKBStructure,
  readIndex,
  rebuildIndex,
  skillFileExists,
  wipeKB,
  writeSkillFile,
} from '@/lib/kb'
import { getProcessed, getNoteContent, listNotes, saveProcessed } from '@/lib/notes'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const reprocessAll = body?.reprocessAll === true

    if (reprocessAll) {
      await wipeKB()
    }

    await ensureKBStructure()

    const allNotes = await listNotes()
    const toProcess = allNotes.filter((n) => n.status !== 'processed')

    let created = 0
    let updated = 0
    const processed = await getProcessed()

    for (const note of toProcess) {
      const content = await getNoteContent(note.filename)
      const currentIndex = await readIndex()
      const entities = await extractEntities(content, note.filename, currentIndex)

      const skillFiles: string[] = []
      const today = new Date().toISOString().split('T')[0]

      for (const entity of entities) {
        const filePath = `${entity.type}/${entity.slug}`
        const exists = await skillFileExists(entity.type, entity.slug)

        if (!exists) {
          const fullContent = `---
name: ${entity.name}
description: ${entity.description}
metadata:
  type: ${entity.type}
  keywords: [${entity.keywords.join(', ')}]
  sources: [${note.filename}]
  updated: ${today}
---

${entity.content}
`
          await writeSkillFile(entity.type, entity.slug, fullContent)
          created++
        } else {
          await appendSkillFile(entity.type, entity.slug, entity.content)
          updated++
        }

        skillFiles.push(filePath)
      }

      const entry = {
        path: note.filename,
        contentHash: note.contentHash,
        processedAt: new Date().toISOString(),
        skillFiles,
      }
      const existingIdx = processed.findIndex((e) => e.path === note.filename)
      if (existingIdx >= 0) processed[existingIdx] = entry
      else processed.push(entry)

      const createdSlugs = entities.filter((e) => e.action === 'create').map((e) => e.slug)
      const appendedSlugs = entities.filter((e) => e.action === 'append').map((e) => e.slug)
      await appendLog(
        `## ${new Date().toISOString()} — ${note.filename}\n\nCreated: ${createdSlugs.join(', ') || 'none'}\nAppended: ${appendedSlugs.join(', ') || 'none'}\n`
      )
    }

    if (toProcess.length > 0) {
      await rebuildIndex()
      await saveProcessed(processed)
    }

    return Response.json({ processed: toProcess.length, created, updated })
  } catch (err) {
    console.error('Process error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
