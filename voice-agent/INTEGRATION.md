# Integration notes

Running list of what must change when `/voice-agent` merges into `/manito`
(PRD section 12, phase 5). Add an entry the moment a difference or assumption
appears.

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
- [ ] **Name split** is a heuristic (`splitName`): 1–3 words → first word is
  `nombres`; 4+ → first two. Better: have Claude extract names and surnames
  separately.
- [ ] **`oficio_principal`** strings: `nombre` is the trade bank's Spanish label
  (`albañil`) or what the person said, `sin_oficio` when there is no trade;
  `tiempo_experiencia` `menos_de_1`/`1_a_3`/`3_a_10`/`mas_de_10`;
  `tiene_herramientas` `tiene`/`perdidas`/`nunca_tuvo`. Confirm with Oli.
- [ ] **Housing:** our `rented`/`relative` map to the `_buen_estado` variants;
  we don't ask about damage there.
- [ ] **Import path:** `toDomain.ts` imports `../../../manito/domain/...`;
  change to `@/domain/...` when moving to `/manito`.

## Assumptions about Oli's side

- [ ] **Persistence:** `persistIntake()` in `lib/agent/persist.ts` builds Persona
  and Perfil with `toDomain()` and only logs. Oli writes the route that saves
  them to Supabase and Mongo; then `persistIntake()` calls it.
- [ ] **Assessment schema differs from PRD section 9:** `pendingChecks[].kind`
  adds `"tools"` (code asks about tools when the person never mentioned them).
  Oli's dashboard must accept it.
- [ ] **`Assessment.needsHuman`** (boolean, not in PRD section 9): the person
  mentioned danger or an urgent need during the conversation. The dashboard
  should surface it above everything else so someone contacts them soon.
  `/api/agent/assess` takes it as `needsHuman` in the request body (from
  `TurnState.needsHuman`).
- [ ] **Distress line** (`DISTRESS_REPLY` in `lib/agent/lines.ts`) is a draft:
  Impaktemos must approve the wording and the emergency number.

## Dependencies to add to `/manito/package.json`

| Package | Kind | Version here |
| --- | --- | --- |
| `zod` | dependency | ^4.6.7 |
| `@anthropic-ai/sdk` | dependency | ^1.3.0 |
| `vitest` | devDependency | ^4.1.12 (5.x needs @types/node ≥22; `/manito` pins ^20) |
| `tsx` | devDependency | ^4.23.15 |
| `@elevenlabs/client` | dependency | ^1.30.0 (Scribe realtime speech-to-text in the browser) |

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
`/manito/.env.local` and to the deployment. Optional: `ELEVENLABS_MODEL_ID`
(voice model, default `eleven_flash_v2_5`).

The ElevenLabs key needs the **Text to Speech** and **Speech to Text**
permissions (voices read-only is enough for the rest). Without Speech to Text,
`/api/voice/scribe-token` fails and the page falls back to Chrome's recognition.

Voice routes to move with the agent routes: `app/api/voice/tts` and
`app/api/voice/scribe-token`.

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
