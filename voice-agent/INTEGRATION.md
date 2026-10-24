# Integration notes

Running list of what must change when `/voice-agent` merges into `/manito`
(PRD section 12, phase 5). Add an entry the moment a difference or assumption
appears.

## Assumptions about Oli's side

- [ ] **Form field names and enums** (`lib/schema/form.ts`) follow PRD section 9
  and have not been confirmed with Oli yet.
- [ ] **Persistence:** `persistIntake()` in `lib/agent/persist.ts` is a mock that
  only logs. Needs Oli's endpoint or function, auth and response shape.
- [ ] **Assessment schema differs from PRD section 9:** `pendingChecks[].kind`
  adds `"tools"` (code asks about tools when the person never mentioned them).
  Oli's dashboard must accept it.

## Dependencies to add to `/manito/package.json`

| Package | Kind | Version here |
| --- | --- | --- |
| `zod` | dependency | ^4.6.7 |
| `@anthropic-ai/sdk` | dependency | ^1.3.0 |
| `vitest` | devDependency | ^4.1.12 (5.x needs @types/node ≥22; `/manito` pins ^20) |
| `tsx` | devDependency | ^4.23.15 |

Scripts to add: `test` (`vitest run`), `test:watch` (`vitest`), and `eval`
(`node --env-file=.env.local --import tsx scripts/eval.ts`; calls Claude).

## Claude API usage

- `claude-haiku-5-5` per turn (`lib/agent/claude.ts`), `claude-sonnet-5-5` for
  the assessment.
- The assessment uses the beta `server-side-fallback-2026-07-01` with
  `fallbacks: "default"` (if a safety classifier declines, the server retries
  on another model). Keep the beta header when moving the code.

## Environment variables

`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`: add to
`/manito/.env.local` and to the deployment.

## Config differences from `/manito`

- **`.gitignore`:** adds `!.env.local.example` after `.env*`, so the example
  env file is committed. `/manito` needs the same line once it has one.
- **`vitest.config.mts`:** new file; move it to `/manito`'s root.
- **`app/layout.tsx`:** voice-agent's own root layout (`lang="es"`, no Geist
  fonts). Drop it at merge; `/demo` will use `/manito`'s layout, so check the
  page still looks right there.
- **`package.json`:** `dev` and `start` use port 3001 here; don't copy that.

## Routes to move

- `app/demo` → `/manito/app/demo`
- `app/api/agent/turn` and `app/api/agent/assess` → `/manito/app/api/agent/*`.
  Both are `POST`, so they are never cached under `cacheComponents`; no
  route config needed.
- `lib/schema/extraction.ts` is internal to the agent (what Claude returns per
  turn); it doesn't need to match anything on Oli's side.
