# Project Goal

Build LIMIT U, a deterministic Personal Destiny Engine and Korean career reflection MVP. No paid AI API.

## Architecture Principles

Raw inputs → features → traits → domain scores → rules → scenarios → report. Domain modules are pure and independent of React. Version data and retain immutable report snapshots.

## Folder Conventions

src/app: routes; src/features: interactive features; src/domain: pure engines; src/lib: adapters; rules and templates: versioned content; supabase: migrations and seed; docs: design decisions.

## DB Principles

Enable RLS on all public tables, index ownership and foreign keys. Never trust client identity, payment status, or user_metadata roles. Server verifies users; report writes are transactional.

## Rule Engine Principles

Conditions, weights, actions and text live in validated JSON. No eval. Same input and version produce identical output; asOf is explicit.

## UI Style

Mobile first, charcoal, ivory, restrained gold, editorial typography, accessible controls. Explain scenario assumptions without claiming scientific prediction.

## Testing Requirements

Test trait bounds, rule operators, ceilings, all three scenarios, age ordering, template selection, determinism, input validation, ownership and payments. Run lint, typecheck, test and build.

## Commands

npm install; npm run dev; npm test; npm run lint; npm run typecheck; npm run build; npm run seed.

## Forbidden Patterns

No hardcoded business rules in UI, paid AI APIs, committed secrets, unsafe any, duplicated business logic, or unverified payment completion. Palm detection must report what it actually measured: propose lines for the user to confirm, show per-line confidence, and never claim depth, branching or medical reading.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
