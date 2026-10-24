// Preguntas de validación de la demo: P18 → P19 → P22 (PRD sección 3)
import type { Level } from "@/lib/agent/rules";
import { findTrade, type Trade } from "@/lib/agent/trades";
import type { FormDraft, YearsBand } from "@/lib/schema/form";

export type PlannedQuestion = {
  id: 18 | 19 | 22;
  text: string;
  criterion: "knowledge" | "coherence" | "externalEvidence";
};

export type QuestionPlan = {
  trade: Trade | null;          // null cuando el oficio no está en el banco
  followUpLevel: Level;
  questions: PlannedQuestion[]; // vacío cuando la persona no tiene oficio
};

// Repregunta básica para <3 años, detalle de experto para >10
const FOLLOW_UP_LEVEL: Record<YearsBand, Level> = {
  lt1: "basic",
  "1to3": "basic",
  "3to10": "intermediate",
  gt10: "expert",
};

// Se usan cuando el oficio no está en el banco
const GENERIC_FOLLOW_UPS: Record<Level, string> = {
  basic: "¿Qué es lo que más cuidado te da cuando haces ese trabajo?",
  intermediate: "¿Qué problema te sale seguido en ese trabajo y cómo lo resuelves?",
  expert: "¿Qué truco del oficio usas que alguien nuevo no conoce?",
};

const VOUCH = "¿Alguien puede dar fe de tu trabajo?";

export function buildQuestionPlan(form: FormDraft): QuestionPlan {
  // Años desconocidos: la repregunta más suave, para que nadie se sienta examinado
  const followUpLevel = form.yearsBand ? FOLLOW_UP_LEVEL[form.yearsBand] : "basic";

  // Sin oficio o quiere aprender uno: sin preguntas técnicas (ruta 🔵 formación)
  if (!form.trade) return { trade: null, followUpLevel, questions: [] };

  const trade = findTrade(form.trade) ?? null;
  const task = trade ? trade.task : `haces un trabajo típico de ${form.trade}`;
  const followUp = trade ? trade.followUps[followUpLevel] : GENERIC_FOLLOW_UPS[followUpLevel];

  return {
    trade,
    followUpLevel,
    questions: [
      { id: 18, text: `Cuéntame paso a paso cómo ${task}.`, criterion: "knowledge" },
      { id: 19, text: followUp, criterion: "coherence" },
      { id: 22, text: VOUCH, criterion: "externalEvidence" },
    ],
  };
}
