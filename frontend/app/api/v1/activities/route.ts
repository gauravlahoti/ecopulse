export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// No seeded data — the dashboard starts empty and is built entirely from what the
// user logs (typed activities computed by the deterministic engine, or photos
// identified by the Ingest Agent). A full deployment would do a user-scoped
// Firestore read here; for the demo the client store holds the session's activities.
export async function GET(): Promise<Response> {
  return Response.json({ activities: [], total: 0 })
}
