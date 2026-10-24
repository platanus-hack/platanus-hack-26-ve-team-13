// Corre las conversaciones de tests/fixtures contra Claude y revisa el resultado (PRD sección 13).
// Uso: npm run eval [-- nombre-o-parte-del-nombre] [-- --verbose]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildAssessment, keepVerbatimQuotes } from "@/lib/agent/assess";
import { ASSESS_MODEL, assessConversation, extractTurn } from "@/lib/agent/claude";
import { initialState, runTurn, type TurnState } from "@/lib/agent/stage";
import { Assessment } from "@/lib/schema/assessment";
import type { FormDraft } from "@/lib/schema/form";

type Fixture = {
  description: string;
  answers: Record<string, string>;
  expect: {
    form?: Record<string, unknown>;
    absent?: string[];
    absentOr?: Record<string, unknown>;
    done?: boolean;
    trust?: string[];
    demonstratedLevel?: string[];
    levelVsYears?: string[];
    route?: string[];
    pendingKinds?: string[];
    maxScore?: Record<string, number>;
    bannedInObservations?: string[];
  };
};

const FIXTURES = join(process.cwd(), "tests/fixtures");
const MAX_TURNS = 14;

const turnMs: number[] = [];

async function converse(f: Fixture): Promise<{ state: TurnState; done: boolean }> {
  let state = initialState();
  for (let i = 0; i < MAX_TURNS; i++) {
    const key = state.asking ?? "";
    const retry = (state.askCounts[state.asking ?? "nameBirth"] ?? 0) > 1;
    // Sin respuesta escrita para "¿Está bien?", la persona confirma
    const fallback = key === "confirm" ? "Sí, así es." : "No sé.";
    const answer = (retry && f.answers[`${key}_retry`]) || f.answers[key] || fallback;
    const start = performance.now();
    const r = await runTurn(state, answer, extractTurn);
    turnMs.push(performance.now() - start);
    state = r.state;
    if (r.done) return { state, done: true };
  }
  return { state, done: false };
}

async function runFixture(name: string, f: Fixture, verbose: boolean): Promise<string[]> {
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => { if (!ok) failures.push(msg); };
  const e = f.expect;

  const { state, done } = await converse(f);
  const form: FormDraft = state.form;
  const modelAssessment = await assessConversation(form, state.history);
  const a = buildAssessment({ form, history: state.history, modelAssessment, model: ASSESS_MODEL });

  if (verbose) {
    for (const l of state.history) console.log(`    ${l.speaker === "manito" ? "Manito " : "Persona"}: ${l.text}`);
  }

  check(done || e.done === false, "conversation did not reach closing");
  for (const [k, v] of Object.entries(e.form ?? {})) {
    const got = form[k as keyof FormDraft];
    check(JSON.stringify(got) === JSON.stringify(v), `form.${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got)}`);
  }
  for (const k of e.absent ?? []) {
    const got = form[k as keyof FormDraft];
    check(got === undefined, `form.${k} should be empty, got ${JSON.stringify(got)}`);
  }
  for (const [k, v] of Object.entries(e.absentOr ?? {})) {
    const got = form[k as keyof FormDraft];
    check(got === undefined || got === v, `form.${k} invented: got ${JSON.stringify(got)}`);
  }

  check(Assessment.safeParse(a).success, "assessment fails the schema");
  const oneOf = (field: string, got: string, allowed?: string[]) =>
    check(!allowed || allowed.includes(got), `${field}: expected ${allowed?.join(" | ")}, got ${got}`);
  oneOf("trust", a.trust, e.trust);
  oneOf("demonstratedLevel", a.demonstratedLevel, e.demonstratedLevel);
  oneOf("levelVsYears", a.levelVsYears, e.levelVsYears);
  oneOf("route", a.route, e.route);
  for (const kind of e.pendingKinds ?? []) {
    check(a.pendingChecks.some((c) => c.kind === kind), `missing pending check: ${kind}`);
  }
  for (const [k, max] of Object.entries(e.maxScore ?? {})) {
    const s = a.scores[k as keyof typeof a.scores].score;
    check(s <= max, `scores.${k}: expected ≤ ${max}, got ${s}`);
  }
  const obs = a.observations.join(" ").toLowerCase();
  for (const word of e.bannedInObservations ?? []) {
    check(!obs.includes(word), `observations judge the person ("${word}"): ${a.observations.join(" ")}`);
  }

  // Calidad del modelo: todo puntaje > 1 debe traer al menos una cita textual
  const verbatim = keepVerbatimQuotes(modelAssessment.scores, state.history);
  for (const [k, s] of Object.entries(modelAssessment.scores)) {
    const kept = verbatim[k as keyof typeof verbatim].quotes.length;
    check(s.score <= 1 || kept > 0, `model scored ${k}=${s.score} without a verbatim quote`);
  }

  const sc = a.scores;
  console.log(
    `    scores S${sc.specificity.score} K${sc.knowledge.score} C${sc.coherence.score} E${sc.externalEvidence.score}` +
    ` · ${a.trust} · ${a.demonstratedLevel} (${a.levelVsYears}) · ${a.route}` +
    ` · checks: ${a.pendingChecks.map((c) => c.kind).join(", ") || "none"}`,
  );
  if (verbose) console.log(`    observations: ${a.observations.join(" ")}`);
  return failures;
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const filter = args.find((a) => !a.startsWith("--"));
  const files = readdirSync(FIXTURES).filter((f) => f.endsWith(".json") && (!filter || f.includes(filter))).sort();

  let failed = 0;
  for (const file of files) {
    const f: Fixture = JSON.parse(readFileSync(join(FIXTURES, file), "utf8"));
    console.log(`\n${file} — ${f.description}`);
    try {
      const failures = await runFixture(file, f, verbose);
      if (failures.length) failed++;
      console.log(failures.length ? failures.map((m) => `  ✗ ${m}`).join("\n") : "  ✓ pass");
    } catch (error) {
      failed++;
      console.log(`  ✗ error: ${error instanceof Error ? error.message : error}`);
    }
  }
  const sorted = [...turnMs].sort((x, y) => x - y);
  const p = (q: number) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0);
  console.log(`\nturn latency: median ${p(0.5)} ms · p90 ${p(0.9)} ms · max ${p(1)} ms (${sorted.length} turns)`);
  console.log(`${files.length - failed}/${files.length} fixtures passed`);
  process.exit(failed ? 1 : 0);
}

main();
