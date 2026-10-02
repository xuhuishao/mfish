import Anthropic from '@anthropic-ai/sdk'

// Routed through OpenRouter's Anthropic-compatible Messages API
const client = new Anthropic({
  baseURL: 'https://openrouter.ai/api',
  apiKey: null,
  authToken: process.env.OPENROUTER_API_KEY,
})
const MODEL = process.env.MODEL ?? 'anthropic/claude-opus-4.8'

export type Entity = {
  action: 'create' | 'append'
  type: 'people' | 'companies' | 'technologies' | 'topics'
  slug: string
  name: string
  description: string
  keywords: string[]
  content: string
}

export async function extractEntities(
  noteContent: string,
  noteFilename: string,
  currentIndex: string
): Promise<Entity[]> {
  const today = new Date().toISOString().split('T')[0]

  // Long notes can yield many entities; stream so a large max_tokens doesn't hit request timeouts
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: `You extract structured entities from venture investor meeting notes and research documents.

Identify people, companies, technologies, and topics worth tracking in a personal knowledge base.

For each entity decide:
- "create": not in the current index → write the full content section
- "append": already exists in the index → write only the new dated section to append

Output ONLY valid JSON, no markdown code blocks, no extra text:
{
  "entities": [
    {
      "action": "create" or "append",
      "type": "people" | "companies" | "technologies" | "topics",
      "slug": "lowercase-hyphenated-slug",
      "name": "Full Display Name",
      "description": "One-line description under 100 chars",
      "keywords": ["keyword1", "keyword2"],
      "content": "Markdown content to write or append"
    }
  ]
}

For "create": content should start with a one-paragraph summary followed by a dated section:
# Entity Name

[Summary paragraph]

## Note: ${noteFilename} (${today})

[Details from this note]

For "append": content should be just the dated section:
## Note: ${noteFilename} (${today})

[New information from this note]

Extract only entities with meaningful information, not passing mentions.`,
    messages: [
      {
        role: 'user',
        content: `Current knowledge base index:\n${currentIndex || '(empty — no entities yet)'}\n\n---\n\nNote filename: ${noteFilename}\n\nNote content:\n${noteContent}`,
      },
    ],
  })

  const response = await stream.finalMessage()
  console.log(
    `[extract] ${noteFilename}: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out, stop=${response.stop_reason}`
  )

  if (response.stop_reason === 'max_tokens') {
    throw new Error(`Entity extraction for "${noteFilename}" was cut off at max_tokens`)
  }

  const text = response.content.find((b) => b.type === 'text')?.text ?? ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    return (parsed.entities ?? []) as Entity[]
  } catch {
    console.error('Failed to parse entity extraction response:', text)
    throw new Error(`Entity extraction for "${noteFilename}" returned invalid JSON`)
  }
}

export async function pickRelevantSlugs(
  question: string,
  indexContent: string
): Promise<string[]> {
  if (!indexContent.trim() || indexContent.includes('(empty)')) return []

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      'Given a knowledge base index and a question, return a JSON object with the slugs of the most relevant skill files. Format: {"slugs": ["type/slug", ...]}. Return at most 5. Output only valid JSON, no markdown.',
    messages: [
      {
        role: 'user',
        content: `Index:\n${indexContent}\n\nQuestion: ${question}`,
      },
    ],
  })

  const text = response.content.find((b) => b.type === 'text')?.text ?? ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const raw = (JSON.parse(cleaned).slugs ?? []) as string[]
    // Models sometimes echo the index's link paths ("companies/acme/SKILL.md") instead of bare slugs
    const slugs = raw.map((s) => s.replace(/^\.?\/?(kb\/)?/, '').replace(/\/SKILL\.md$/i, ''))
    console.log(`[chat] picked: ${slugs.join(', ') || '(none)'}`)
    return slugs
  } catch {
    console.error('Failed to parse slug selection response:', text)
    return []
  }
}

export async function streamAnswer(
  question: string,
  skillFileContents: Map<string, string>
): Promise<ReadableStream<Uint8Array>> {
  const sources = Array.from(skillFileContents.keys())
  const context = sources
    .map((s) => `### ${s}\n${skillFileContents.get(s)}`)
    .join('\n\n---\n\n')

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system:
      'You are a knowledge assistant for a venture investor. Answer questions using only the provided skill files from their personal knowledge base. Be concise and cite which skill files support your answer.',
    messages: [
      {
        role: 'user',
        content: `Skill files:\n\n${context || '(no relevant files found)'}\n\n---\n\nQuestion: ${question}`,
      },
    ],
  })

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            )
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, sources })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })
}
