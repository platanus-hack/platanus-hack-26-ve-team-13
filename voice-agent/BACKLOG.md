# Backlog

## Store the transcript with each intake

`persistIntake()` (`lib/agent/persist.ts`) receives only `{ form, assessment }`.
The full question-and-answer history (`TurnState.history`) is sent to
`/api/agent/assess` and then dropped, so the only record of what the person
said is the short quotes inside the assessment scores.

- Add `history: Line[]` to `Intake` and pass it from `app/api/agent/assess/route.ts`.
- Also keep `TURN_PROMPT_VERSION` / `ASSESS_PROMPT_VERSION` alongside it, so an
  assessment can be traced to the prompts that produced it.
- Agree with Oli where it lives and who can read it: it holds ID numbers,
  phone numbers and birth dates, so it needs the same access rules as the form.
- Lets a coordinator check a score against what was actually said, and lets us
  re-run evaluations when the prompts change.

## Generate questions for trades outside the bank

When `findTrade()` finds nothing, `buildQuestionPlan()` (`lib/agent/plan.ts`) asks
"cómo haces un trabajo típico de {trade}" plus a generic follow-up, and the
assessor gets no reference (no expected steps, vocabulary or tools). Answers are
vague and scores vary, which is unfair to people whose trade isn't listed.
Not needed for the demo: we'll use a trade already in the bank.

- Ask the trade right after `nameBirth` in `REGISTER_ORDER` (`lib/agent/stage.ts`),
  so the ID and phone turns give the generation time to finish.
- When a turn returns a `form.trade` that isn't in the bank, the client calls a
  new `/api/agent/trade-plan` route without waiting for it. The route asks Claude
  for a full `Trade` object, using the bank entries as examples, and checks it
  with a zod schema of `Trade`. The client keeps the result in
  `TurnState.generatedTrade`.
- `buildQuestionPlan()` and `assessUserMessage()` use the bank first, then
  `generatedTrade`, then the current generic questions. Always fall back: if the
  plan isn't ready by P18 or the call failed, the conversation never waits.
- Cache generated trades by normalized name, so two people with the same trade
  get the same questions and comparable scores. Needs somewhere to store them
  (`persistIntake()` is still a mock; see `INTEGRATION.md`). Cached entries are
  the list for someone who knows the trade to review and add to the bank.

## Hint after a thin answer in the trade questions (phase 4)

In the validation stage (P18, P19, P22) Manito asks each question once. When the
person answers too briefly ("no creo", "lo normal"), they never get a second
chance, and the assessment scores 0–1 with route 🔴 even if it was just nerves.
Found in a manual test (pianist, short answers). Build it in phase 4 with the
guarded asides, after real voice answers show how often STT cuts people off.

- Add `thinAnswer: boolean` to `Extraction` (`lib/schema/extraction.ts`): the
  person answered, but too briefly or vaguely to show anything.
- In `runTurn()` (`lib/agent/stage.ts`), on a thin answer to P18/P19/P22 that
  hasn't had a hint yet, ask again with a fixed hint from `lib/agent/lines.ts`.
  At most one hint per question; never "no te entendí". A full answer gets no
  hint, so the demo doesn't get longer.
- Draft hints:
  - P18: "Tranquilo, con tus palabras: ¿qué haces primero, qué después, y con
    qué materiales o herramientas?"
  - P19: "Piensa en una vez que te pasó en un trabajo. ¿Qué hiciste?"
  - P22: "Por ejemplo, un cliente o un vecino para quien trabajaste, fotos de tus
    trabajos en el teléfono, o si tenías un negocio con RIF." (also covers P23
    and P24 at no cost)
- Eval fixture with short first answers and fuller second ones: the hint fires
  and the scores use the second answer. José's demo must stay unchanged.

## Finishing early before the trade gives route "training"

If the conversation ends before the trade question (presenter clicks Finish,
or `/fin` in `npm run chat`), `form.trade` is `undefined`, and `deriveRoute()`
(`lib/agent/rules.ts`) treats it like "no trade" (`null`) → 🔵 training.
Coherence also scores 0 against an empty form. An unanswered trade should give
`not_assessed` and a route that asks a person to finish the registration, not
a training offer.
