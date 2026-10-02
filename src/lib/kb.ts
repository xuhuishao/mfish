import fs from 'fs/promises'
import path from 'path'

export function kbDir(): string {
  const raw = process.env.KB_DIR ?? './kb'
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw)
}

const SCHEMA_CONTENT = `---
name: Entity Name
description: One-line description
metadata:
  type: companies|people|technologies|topics
  keywords: [list, of, keywords]
  sources: [note-filename.md]
  updated: 2026-10-01
---

# Entity Name

[Concise summary of the entity]

## Note: source-note.md (2026-10-01)

[Content extracted from this specific note]
`

export async function ensureKBStructure(): Promise<void> {
  const dir = kbDir()
  await fs.mkdir(dir, { recursive: true })
  await Promise.all([
    fs.mkdir(path.join(dir, 'people'), { recursive: true }),
    fs.mkdir(path.join(dir, 'companies'), { recursive: true }),
    fs.mkdir(path.join(dir, 'technologies'), { recursive: true }),
    fs.mkdir(path.join(dir, 'topics'), { recursive: true }),
  ])
  const schemaPath = path.join(dir, 'SCHEMA.md')
  try {
    await fs.access(schemaPath)
  } catch {
    await fs.writeFile(schemaPath, SCHEMA_CONTENT)
  }
}

export async function wipeKB(): Promise<void> {
  const dir = kbDir()
  const types = ['people', 'companies', 'technologies', 'topics']
  await Promise.all(
    types.map(async (t) => {
      await fs.rm(path.join(dir, t), { recursive: true, force: true })
      await fs.mkdir(path.join(dir, t), { recursive: true })
    })
  )
  for (const file of ['index.md', 'log.md', 'processed.json']) {
    try {
      await fs.unlink(path.join(dir, file))
    } catch {
      // file didn't exist — that's fine
    }
  }
}

export async function readIndex(): Promise<string> {
  try {
    return await fs.readFile(path.join(kbDir(), 'index.md'), 'utf-8')
  } catch {
    return ''
  }
}

export async function skillFileExists(type: string, slug: string): Promise<boolean> {
  try {
    await fs.access(path.join(kbDir(), type, slug, 'SKILL.md'))
    return true
  } catch {
    return false
  }
}

export async function readSkillFile(type: string, slug: string): Promise<string> {
  return fs.readFile(path.join(kbDir(), type, slug, 'SKILL.md'), 'utf-8')
}

export async function writeSkillFile(type: string, slug: string, content: string): Promise<void> {
  const dir = path.join(kbDir(), type, slug)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, 'SKILL.md'), content)
}

export async function appendSkillFile(type: string, slug: string, section: string): Promise<void> {
  const filePath = path.join(kbDir(), type, slug, 'SKILL.md')
  await fs.appendFile(filePath, '\n\n' + section)
}

function extractFrontmatter(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

export async function rebuildIndex(): Promise<void> {
  const dir = kbDir()
  const types = ['people', 'companies', 'technologies', 'topics']
  const entries: Array<{ type: string; slug: string; name: string; description: string }> = []

  for (const type of types) {
    let slugs: string[]
    try {
      const dirents = await fs.readdir(path.join(dir, type), { withFileTypes: true })
      slugs = dirents.filter((d) => d.isDirectory()).map((d) => d.name)
    } catch {
      continue
    }

    for (const slug of slugs) {
      try {
        const content = await fs.readFile(path.join(dir, type, slug, 'SKILL.md'), 'utf-8')
        const name = extractFrontmatter(content, 'name') ?? slug
        const description = extractFrontmatter(content, 'description') ?? ''
        entries.push({ type, slug, name, description })
      } catch {
        // skip unreadable files
      }
    }
  }

  const grouped = Object.fromEntries(types.map((t) => [t, entries.filter((e) => e.type === t)]))
  const sections = types
    .filter((t) => grouped[t].length > 0)
    .map((t) => {
      const rows = grouped[t]
        .map((e) => `- [${e.name}](${t}/${e.slug}/SKILL.md) — ${e.description}`)
        .join('\n')
      return `## ${t.charAt(0).toUpperCase() + t.slice(1)}\n\n${rows}`
    })

  const content =
    sections.length > 0
      ? `# Knowledge Base Index\n\n${sections.join('\n\n')}\n`
      : '# Knowledge Base Index\n\n(empty)\n'

  await fs.writeFile(path.join(dir, 'index.md'), content)
}

export async function appendLog(entry: string): Promise<void> {
  const logPath = path.join(kbDir(), 'log.md')
  await fs.appendFile(logPath, entry + '\n')
}
