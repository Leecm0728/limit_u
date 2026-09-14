# Architecture

Next.js modular monolith, TypeScript pure engines, versioned JSON catalog, Supabase Auth/Postgres. Demo mode uses browser session storage; production uses verified auth and transactional snapshots. No generative API calls.

Input schema → source feature adapters (career/life/palm/saju) → weighted traits with provenance → domain scores → compositional rule matching → three assumption-based trajectories → structured template rendering.

All calculations use explicit asOf dates and catalog versions. Historical reports embed inputs, evidence and full outputs, so catalog changes cannot rewrite history. Palm photos remain in browser memory and are never uploaded in MVP. Manual line tracing is explicit; unmeasured features remain absent.

Catalog edits create a new version. Public catalog is read-only; administrators require a server-maintained admin_users row. Server validates submitted inputs and recomputes reports. Payments use a provider interface and server-owned amounts/status. Mock receipts never grant real entitlements.

For 1k–10k users: stateless application, pooled Supabase API access, indexed owner/session lookups and immutable JSON snapshots. Background jobs may be added for expensive processing; no microservices required.
