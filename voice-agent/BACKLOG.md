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
