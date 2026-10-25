// Arma la evaluación final: lo que dijo el modelo + lo que calcula el código (PRD sección 4)
import {
  capUnquotedScores,
  codePendingChecks,
  deriveRoute,
  deriveTrust,
  levelVsYears,
  type PendingCheck,
  type Scores,
} from "@/lib/agent/rules";
import type { Line } from "@/lib/agent/stage";
import type { Assessment, ModelAssessment } from "@/lib/schema/assessment";
import type { FormDraft } from "@/lib/schema/form";

const comparable = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Solo cuentan las citas que aparecen en lo que dijo la persona
export function keepVerbatimQuotes(scores: Scores, history: Line[]): Scores {
  const said = comparable(history.filter((l) => l.speaker === "persona").map((l) => l.text).join(" "));
  const keep = (s: Scores[keyof Scores]) => ({
    ...s,
    quotes: s.quotes.filter((q) => comparable(q).length > 0 && said.includes(comparable(q))),
  });
  return {
    specificity: keep(scores.specificity),
    knowledge: keep(scores.knowledge),
    coherence: keep(scores.coherence),
    externalEvidence: keep(scores.externalEvidence),
  };
}

// Demo corta: sin preguntas del oficio no hay nada que puntuar, así que no se llama al modelo
export const UNSCORED_MODEL = "ninguno";

export function buildUnscoredAssessment(input: { form: FormDraft; needsHuman?: boolean; now?: Date }): Assessment {
  const { form } = input;
  const reference: PendingCheck[] = form.reference ? [{ kind: "reference", detail: form.reference }] : [];
  return {
    demonstratedLevel: "not_assessed",
    observations: [form.reference
      ? "No se evaluó el oficio en la conversación; dio una referencia para contactar."
      : "No se evaluó el oficio en la conversación y no dio referencias."],
    toolsNeeded: [],
    pendingChecks: [...reference, ...codePendingChecks(form)],
    levelVsYears: "not_assessed",
    trust: "declared",
    route: deriveRoute(form, undefined, "declared"),
    needsHuman: input.needsHuman ?? false,
    model: UNSCORED_MODEL,
    assessedAt: (input.now ?? new Date()).toISOString(),
  };
}

export function buildAssessment(input: {
  form: FormDraft;
  history: Line[];
  modelAssessment: ModelAssessment;
  model: string;
  needsHuman?: boolean;
  now?: Date;
}): Assessment & { scores: Scores } {
  const { form, history, modelAssessment: m } = input;
  const scores = capUnquotedScores(keepVerbatimQuotes(m.scores, history));
  // Sin oficio no hay conocimiento que evaluar
  const demonstratedLevel = form.trade === null ? "not_assessed" : m.demonstratedLevel;
  const trust = deriveTrust(scores, demonstratedLevel);

  return {
    ...m,
    scores,
    demonstratedLevel,
    // "tools" y "registration" los decide el código, no el modelo
    pendingChecks: [
      ...m.pendingChecks.filter((c) => c.kind !== "tools" && c.kind !== "registration"),
      ...codePendingChecks(form),
    ],
    levelVsYears: levelVsYears(demonstratedLevel, form.yearsBand),
    trust,
    route: deriveRoute(form, scores, trust),
    needsHuman: input.needsHuman ?? false,
    model: input.model,
    assessedAt: (input.now ?? new Date()).toISOString(),
  };
}
