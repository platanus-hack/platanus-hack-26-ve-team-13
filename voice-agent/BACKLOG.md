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

## Check how the voice reads numbers back

Manito reads back data for a yes/no check (`confirmLine` in `lib/agent/lines.ts`),
written as "cédula V-15.234.876" and "teléfono 0412-555-1234". Listen to how
ElevenLabs says them; if it reads the phone as one big number, spell the digits
out in the text instead.

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
