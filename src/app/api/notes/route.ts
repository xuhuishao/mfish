import { listNotes } from '@/lib/notes'

export async function GET() {
  try {
    const notes = await listNotes()
    return Response.json({ notes })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
