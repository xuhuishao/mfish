import { pickRelevantSlugs, streamAnswer } from '@/lib/claude'
import { readIndex, readSkillFile, skillFileExists } from '@/lib/kb'

export async function POST(request: Request) {
  const { message } = await request.json()

  if (!message?.trim()) {
    return new Response('Missing message', { status: 400 })
  }

  const indexContent = await readIndex()
  const encoder = new TextEncoder()

  if (!indexContent || indexContent.includes('(empty)')) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ text: 'Your knowledge base is empty. Process some notes first on the Processing page.' })}\n\n`
          )
        )
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, sources: [] })}\n\n`)
        )
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }

  const slugs = await pickRelevantSlugs(message, indexContent)

  const skillFileContents = new Map<string, string>()
  await Promise.all(
    slugs.map(async (slug) => {
      const parts = slug.split('/')
      if (parts.length < 2) return
      const type = parts[0]
      const name = parts.slice(1).join('/')
      if (await skillFileExists(type, name)) {
        skillFileContents.set(slug, await readSkillFile(type, name))
      }
    })
  )

  const answerStream = await streamAnswer(message, skillFileContents)

  return new Response(answerStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
