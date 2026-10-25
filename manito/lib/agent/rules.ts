// Reglas de confianza, ruta y nivel (PRD sección 4). Se calculan en código, nunca las decide el modelo.
import type { Assessment, ModelAssessment } from "@/lib/schema/assessment";
import type { FormDraft, YearsBand } from "@/lib/schema/form";

export type Scores = ModelAssessment["scores"];
export type Level = Exclude<ModelAssessment["demonstratedLevel"], "not_assessed">;
export type Trust = Assessment["trust"];
export type Route = Assessment["route"];
export type PendingCheck = ModelAssessment["pendingChecks"][number];

const TRUST_ORDER: Trust[] = ["declared", "probed", "with_reference", "verified"];
const LEVEL_ORDER: Level[] = ["basic", "intermediate", "expert"];

// 4.1: sin cita → el puntaje no puede pasar de 1
export function capUnquotedScores(scores: Scores): Scores {
  const cap = (s: Scores[keyof Scores]) =>
    s.quotes.length === 0 && s.score > 1 ? { ...s, score: 1 } : s;
  return {
    specificity: cap(scores.specificity),
    knowledge: cap(scores.knowledge),
    coherence: cap(scores.coherence),
    externalEvidence: cap(scores.externalEvidence),
  };
}

// 4.3: la IA nunca asigna "verified"; eso lo hace una persona o un sistema posterior
export function deriveTrust(
  scores: Scores,
  demonstratedLevel: ModelAssessment["demonstratedLevel"],
): Trust {
  if (demonstratedLevel === "not_assessed") return "declared";
  const probed = scores.knowledge.score >= 2 && scores.coherence.score >= 2;
  if (!probed) return "declared";
  return scores.externalEvidence.score >= 2 ? "with_reference" : "probed";
}

// 4.2: rango de niveles esperado según los años declarados
export function expectedLevel(yearsBand: YearsBand): [Level, Level] {
  switch (yearsBand) {
    case "lt1":
      return ["basic", "basic"];
    case "1to3":
      return ["basic", "intermediate"];
    case "3to10":
      return ["intermediate", "intermediate"];
    case "gt10":
      return ["intermediate", "expert"];
  }
}

export function levelVsYears(
  demonstratedLevel: ModelAssessment["demonstratedLevel"],
  yearsBand: YearsBand | undefined,
): Assessment["levelVsYears"] {
  if (demonstratedLevel === "not_assessed" || !yearsBand) return "not_assessed";
  const [min, max] = expectedLevel(yearsBand).map((l) => LEVEL_ORDER.indexOf(l));
  const actual = LEVEL_ORDER.indexOf(demonstratedLevel);
  if (actual < min) return "below";
  if (actual > max) return "above";
  return "matches";
}

// 4.4: gana la primera regla que aplique. Sin puntajes (demo corta) solo cuentan
// el oficio, las herramientas y la cédula.
export function deriveRoute(form: FormDraft, scores: Scores | undefined, trust: Trust): Route {
  const hasTrade = form.trade != null;
  const manyYears = form.yearsBand === "3to10" || form.yearsBand === "gt10";

  // 🔴 Coherencia y conocimiento se miden sobre el oficio declarado, así que una
  // persona sin oficio va a formación y no a revisión.
  if (scores && hasTrade && (scores.coherence.score <= 1 || (scores.knowledge.score <= 1 && manyYears))) {
    return "human_review";
  }
  if (!hasTrade) return "training";

  const atLeastProbed = TRUST_ORDER.indexOf(trust) >= TRUST_ORDER.indexOf("probed");
  // No está en la tabla del PRD: un oficio que esta conversación no pudo confirmar.
  // Una persona hace seguimiento en vez de enviarlo a matching.
  if (scores && !atLeastProbed) return "human_review";

  // Herramientas o cédula desconocidas no cuentan como faltantes (ver codePendingChecks)
  const missingTools = form.tools === "lost" || form.tools === "never_had";
  const missingId = form.idStatus !== undefined && form.idStatus !== "valid";
  return missingTools || missingId ? "ready_with_support" : "ready_to_match";
}

// Verificaciones que agrega el código además de las del modelo
export function codePendingChecks(form: FormDraft): PendingCheck[] {
  const checks: PendingCheck[] = [];
  if (form.trade != null && form.tools === undefined) {
    checks.push({ kind: "tools", detail: "Preguntar si tiene herramientas de trabajo" });
  }
  // Datos del registro que no se tomaron en la conversación (demo corta, o no los dio)
  const missing = [
    form.idStatus === undefined && "cédula",
    form.birthDate === undefined && "fecha de nacimiento",
    form.phone === undefined && "teléfono",
  ].filter(Boolean);
  if (missing.length) checks.push({ kind: "registration", detail: `Completar registro: ${missing.join(", ")}` });
  return checks;
}
