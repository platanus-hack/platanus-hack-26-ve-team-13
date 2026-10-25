# Integration notes

`/voice-agent` was merged into `/manito` on 2026-10-25 (PRD section 12, phase 5).
This file keeps what was decided along the way and what is still open with Oli.
Add an entry the moment a difference or assumption appears.

## Open with Oli (after the merge)

- [ ] **`utils/supabase/service.ts` now also saves
  `validacion_tecnica_ia.evaluacion_detallada`** (one line, added by us): without
  it the full assessment was dropped and only `resumen_validacion` reached Mongo.
- [ ] **`next build` fails without DB env vars:** `app/api/registro/route.ts`
  and `service.ts` create the Supabase and Mongo clients at import time, and
  both throw on an empty URL. `persistIntake()` imports the service lazily and
  falls back to a log-only mock when `NEXT_PUBLIC_SUPABASE_URL` or
  `MONGODB_URI` is missing, but `/api/registro` still breaks the build.
- [ ] **Shared `MongoClient` closed in `finally`:** two concurrent requests can
  close each other's connection. Suggest one client per process, never closed.
- [ ] **`Persona.id` comes from Supabase:** the insert ignores our `intakeId`;
  `persistIntake()` returns the generated `persona_id`. `fechas` are not saved.
- [ ] **`Persona.numero_cedula` is `NOT NULL` in Supabase** although the domain
  makes it optional. Workaround: `toDomain` sends `SIN_DATO.numero_cedula`
  (`"00000000"`) when the person gave none, and `service.ts` now passes the
  number through instead of nulling it for `perdida`/`no_tiene`. Revert both
  once the column is nullable. `telefono`, `refugio` and `direccion` may hit
  the same constraint.
- [ ] **Lint:** 3 `no-explicit-any` errors in `api/registro/route.ts`,
  `app/page.tsx` and `service.ts`.

## Mapping to Oli's domain (`manito/domain`)

Decided 2026-10-24. Our Zod schemas stay as the agent's internal format;
`lib/agent/toDomain.ts` translates `{ form, assessment }` into `IPersona`
(Supabase) and `IPerfil` (Mongo). **Every value stored in Oli's DB is in
Spanish.** `intakeId` becomes `Persona.id` and `Perfil.persona_id`.

- [x] **Changes made in `manito/domain`** (tell Oli):
  - `BusquedaLaboral` adds `'independiente'` (our `freelance`).
  - `IReferencia.telefono` is optional; adds `detalle?`.
  - `IValidacionTecnicaIA` adds `evaluacion_detallada?: IEvaluacionDetallada`
    (full assessment in Spanish: scores with quotes, level, trust, route,
    `necesita_humano`, pending checks), with new enum types `NivelConfianza`,
    `NivelDemostrado`, `NivelVsExperiencia`, `RutaAtencion`, `TipoVerificacion`.
- [x] **`resumen_validacion`:** trust with_reference/verified → `alto`,
  probed → `medio`, declared → `dudoso`; `puntuacion_global` = sum of the four
  scores (0–12); `resumen_ia` = observations joined.
- [ ] **Fixed values for required fields the demo doesn't ask** (`SIN_DATO` in
  `toDomain.ts`): `fecha_nacimiento` 1900-01-01 if declined, `estado_vivienda`
  `refugio`, `nivel_estudio` `primaria`, `disponibilidad_laboral` `solo_local`,
  `busqueda_laboral` `empleo`, `historial_laboral` empty,
  `negocio_propio.tuvo_negocio` false, `referencias[].relacion` /
  `tiempo_experiencia` / `tiene_herramientas` `"sin_dato"`. Replace once Oli
  makes these optional.
- [x] **Name split:** Claude returns `lastNames` (the surname part of `name`,
  stored on the form). `splitName` uses it when it matches the end of `name`;
  otherwise it falls back to word count (1–3 words → first word is `nombres`,
  4+ → first two).
- [ ] **`oficio_principal`** strings: `nombre` is the trade bank's Spanish label
  (`albañil`) or what the person said, `sin_oficio` when there is no trade;
  `tiempo_experiencia` `menos_de_1`/`1_a_3`/`3_a_10`/`mas_de_10`;
  `tiene_herramientas` `tiene`/`perdidas`/`nunca_tuvo`. Confirm with Oli.
- [ ] **Housing:** our `rented`/`relative` map to the `_buen_estado` variants;
  we don't ask about damage there.
- [x] **Import path:** `toDomain.ts` imports `@/domain/...`.

## Assumptions about Oli's side

- [x] **Persistence:** `persistIntake()` in `lib/agent/persist.ts` builds Persona
  and Perfil with `toDomain()` and calls Oli's `sendDatabaseRequest()`
  (`utils/supabase/service.ts`). Without DB env vars it only logs. If saving
  fails, `/api/agent/assess` still returns the assessment with
  `persisted: false`.
- [ ] **Assessment schema differs from PRD section 9:** `pendingChecks[].kind`
  adds `"tools"` (code asks about tools when the person never mentioned them)
  and `"registration"` (cédula, birth date or phone not taken; stored as
  `'registro'` in `TipoVerificacion`). Oli's dashboard must accept them.
- [ ] **Short demo flow** (`TurnState.flow = "short"`, used by `/demo`): asks
  only the name, then trade and years, then whether someone can vouch for
  their work (P22, with "we'll contact them later"). No technical questions
  (P18, P19). `Form.idStatus` is optional (PRD
  section 9 had it required); an unknown cédula doesn't count as missing
  documents for the route, and Persona gets `estado_cedula: 'no_tiene'` from
  `SIN_DATO` until Oli makes it optional. The full flow is still in the code.
- [ ] **Unscored assessment in the short flow:** `/api/agent/assess` takes
  `flow` in the body; for `"short"` it doesn't call Claude
  (`buildUnscoredAssessment`). `Assessment.scores` is optional, level is
  `not_assessed`, trust `declared`, `model` `"ninguno"`, and the route comes
  only from trade, tools and cédula (`deriveRoute` with no scores). The person
  they named (`Form.reference`, new) becomes a `reference` pending check and a
  `referencias[]` entry. In Perfil, `resumen_validacion` is left out (no
  `puntuacion_global`) and `evaluacion_detallada.puntajes` are 0 with reason
  "No evaluado" because `IEvaluacionDetallada` requires them. Ask Oli to make
  `puntajes` optional.
- [ ] **`Assessment.needsHuman`** (boolean, not in PRD section 9): the person
  mentioned danger or an urgent need during the conversation. The dashboard
  should surface it above everything else so someone contacts them soon.
  `/api/agent/assess` takes it as `needsHuman` in the request body (from
  `TurnState.needsHuman`).
- [ ] **Distress line** (`DISTRESS_REPLY` in `lib/agent/lines.ts`) is a draft:
  Impaktemos must approve the wording and the emergency number.

## Dependencies added to `/manito/package.json`

| Package | Kind | Version here |
| --- | --- | --- |
| `zod` | dependency | ^4.6.7 |
| `@anthropic-ai/sdk` | dependency | ^1.3.0 |
| `vitest` | devDependency | ^4.1.12 (5.x needs @types/node ≥22; `/manito` pins ^20) |
| `tsx` | devDependency | ^4.23.15 |
| `@elevenlabs/client` | dependency | ^1.30.0 (Scribe realtime speech-to-text in the browser) |

Scripts added: `test` (`vitest run`), `test:watch` (`vitest`), `eval`
(`node --env-file=.env.local --import tsx scripts/eval.ts`; calls Claude) and
`chat`.

## Claude API usage

- `claude-haiku-5-5` per turn (`lib/agent/claude.ts`), `claude-sonnet-5-5` for
  the assessment.
- The assessment uses the beta `server-side-fallback-2026-07-01` with
  `fallbacks: "default"` (if a safety classifier declines, the server retries
  on another model). Keep the beta header when moving the code.

## Environment variables

`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, plus Oli's
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `MONGODB_URI` and optional
`MONGODB_DB_NAME`: in `/manito/.env.local` and in the deployment (see
`.env.local.example`). Optional: `ELEVENLABS_SPEED` (default 1.1),
`ELEVENLABS_MODEL_ID` (voice model, default `eleven_flash_v2_5`).

The ElevenLabs key needs the **Text to Speech** and **Speech to Text**
permissions (voices read-only is enough for the rest). Without Speech to Text,
`/api/voice/scribe-token` fails and the page falls back to Chrome's recognition.

## What the merge changed in `/manito`

- **`.gitignore`:** `!.env.local.example` after `.env*`, so the example env
  file is committed.
- **`vitest.config.mts`** at the root; tests in `tests/`, scripts in `scripts/`.
- **`app/layout.tsx`:** voice-agent's layout was dropped; `/manito`'s now has
  `lang="es"` and the title "Manito".
- **Routes moved:** `app/demo`, `app/api/agent/{turn,assess}` and
  `app/api/voice/{tts,scribe-token}`. All API routes are `POST`, so they are
  never cached under `cacheComponents`.
- `lib/schema/extraction.ts` is internal to the agent (what Claude returns per
  turn); it doesn't need to match anything on Oli's side.
