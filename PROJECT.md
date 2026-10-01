# mfish — an AI knowledge companion

## What it is
A local-first web app that turns my notes into an organized knowledge base and lets me chat with my own
knowledge. I drop meeting summaries/notes, research papers, business proposals or articles into a local
folder; mfish generates a set of skill files (.md) organized by people, companies, technologies and topics,
and answers questions grounded in the relevant skill files.

It runs on my machine (`npm run dev`). Notes and skill files stay on local disk; only LLM calls leave the machine.

## Who it's for
Me — a venture investor focusing on deep tech and AI startup investments, who wants to keep highly relevant
notes about people, companies and technologies always on the leading edge.

## v1 goals (what "done" looks like)
- Read notes from a local notes folder (path set in config). A "Scan folder" button refreshes the list — no live file watching.
- A "Processing files" sub-page lists the notes (newest first, no pagination) with status: new / changed / processed.
- A "Process" button on that page processes all new and changed notes.
- Processing state is tracked in a separate local list (`processed.json`); a "Reprocess all" button wipes the knowledge base and rebuilds it from every note.
- A chat interface to chat with all of my skill files, citing which skill files each answer used.

## Knowledge base design (follows the "LLM Wiki" pattern)
- **Three layers:** raw notes (read-only, never modified) → the knowledge base of skill files (written by the LLM) → `SCHEMA.md` (conventions the LLM follows when writing).
- **Folder structure:** fixed top-level folders — `people/`, `companies/`, `technologies/`, `topics/`.
- **Skill file format:** Claude Skill format — one folder per entity containing a `SKILL.md`, e.g. `companies/acme-robotics/SKILL.md`. YAML frontmatter has `name` and `description` (required by the Skill format) plus `metadata` (type, keywords, sources, updated).
- **Naming:** folder name is a normalized slug of the entity name (lowercase, hyphenated).
- **Append-only updates:** if a note mentions an entity whose slug/keywords match an existing skill file (e.g. a new update about the same company), mfish appends a dated section to that file with a link back to the source note. It never rewrites existing content. Otherwise it creates a new skill file.
- **`index.md`:** a catalog of every skill file with a one-line summary, grouped by folder. Updated on every ingest.
- **`log.md`:** an append-only, chronological record of each ingest (which note, which skill files were created or updated).
- **Finding relevant files:** for chat, the LLM reads `index.md` first, picks the relevant skill files, then reads them to answer. No vector database or embeddings in v1.

## Non-goals for v1 (explicitly NOT building these)
- Multi-user / accounts. Just me for now.
- Hosting/deployment. v1 runs locally only.
- File uploads (PDF, audio). v1 is plain text (.md / .txt) only.
- Live folder watching, pagination, chat history persistence, an in-app skill file editor (I'll use my editor).
- Smart merging / entity deduplication / rewriting skill files. Append-only for v1; cleanup is v2.
- Mobile-first UI. Desktop is fine; mobile is a stretch.
- Deploying the knowledge base (all the skill files) as an MCP server to be integrated into the Claude and ChatGPT apps.

## Data shapes (rough — refine on Day 3)
- Note           — a file in the notes folder; the folder is the source of truth (no database). Title = filename.
- ProcessedEntry { path, contentHash, processedAt, skillFiles[] }  — stored in `processed.json`. A note whose hash changed shows as "changed".
- SkillFile      { slug, type, name, description, keywords, sources[], updatedAt, content }  — a `SKILL.md` on disk.
- Config         { notesDir, kbDir }  — in `.env.local`; both folders live outside the repo so personal data is never committed.

## Open questions / risks
- **Riskiest assumption:** that the generated knowledge base answers questions better than searching raw notes. Test on Day 1–2: run ~10 real notes through the extraction prompt by hand and compare answers to ~5 real questions against both.
- Editing an already-processed note appends a second section for the same note. Accepted for v1; "Reprocess all" cleans it up.
- Name variants ("Sequoia" vs "Sequoia Capital") will create duplicate skill files. Accepted for v1.
- What kinds of questions chat should handle well (e.g. "what's the key takeaway?") — revisit later.

## The Day 7 demo
1. Run `npm run dev` and open http://localhost:3000.
2. Drop a new note into the notes folder.
3. On "Processing files", click "Scan folder" — the note shows as new.
4. Click "Process" — show which skill files were created or updated.
5. Open the chat — ask a question about the note.
6. mfish answers using the updated skill files and cites them.
