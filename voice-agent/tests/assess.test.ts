import { describe, expect, it } from "vitest";
import { buildAssessment, keepVerbatimQuotes } from "@/lib/agent/assess";
import type { Line } from "@/lib/agent/stage";
import { Assessment, type ModelAssessment } from "@/lib/schema/assessment";
import type { FormDraft } from "@/lib/schema/form";

const history: Line[] = [
  { speaker: "manito", text: "Cuéntame paso a paso cómo frisas una pared." },
  { speaker: "persona", text: "Mojo la pared, pongo las maestras con el nivel y termino con la llana." },
  { speaker: "manito", text: "¿Alguien puede dar fe de tu trabajo?" },
  { speaker: "persona", text: "Sí, la señora Carmen, en Catia La Mar. Le frisé la casa el año pasado." },
];

const score = (n: number, quotes: string[]) => ({ score: n, quotes, reason: "r" });

const model: ModelAssessment = {
  scores: {
    specificity: score(2, ["la señora Carmen, en Catia La Mar"]),
    knowledge: score(3, ["pongo las maestras con el nivel"]),
    coherence: score(3, ["Mojo la pared"]),
    externalEvidence: score(2, ["Le frisé la casa el año pasado"]),
  },
  demonstratedLevel: "expert",
  observations: ["Explica el friso con detalle."],
  toolsNeeded: ["cuchara", "llana"],
  pendingChecks: [{ kind: "reference", detail: "señora Carmen, Catia La Mar" }],
};

const jose: FormDraft = { trade: "masonry", yearsBand: "gt10", idStatus: "valid", tools: "lost" };

describe("keepVerbatimQuotes", () => {
  it("keeps quotes the person said, ignoring case, accents and punctuation", () => {
    const s = keepVerbatimQuotes({ ...model.scores, knowledge: score(3, ["Pongo las maestras, con el nivel"]) }, history);
    expect(s.knowledge.quotes).toHaveLength(1);
  });

  it("drops invented quotes and Manito's words", () => {
    const s = keepVerbatimQuotes(
      { ...model.scores, knowledge: score(3, ["uso un codal de aluminio", "cómo frisas una pared"]) },
      history,
    );
    expect(s.knowledge.quotes).toEqual([]);
  });
});

describe("buildAssessment", () => {
  it("produces the expected demo profile", () => {
    const a = buildAssessment({ form: jose, history, modelAssessment: model, model: "test" });
    expect(Assessment.safeParse(a).success).toBe(true);
    expect(a.trust).toBe("with_reference");
    expect(a.levelVsYears).toBe("matches");
    expect(a.route).toBe("ready_with_support");
    expect(a.pendingChecks).toEqual([{ kind: "reference", detail: "señora Carmen, Catia La Mar" }]);
  });

  it("a high score whose only quote was invented is capped at 1", () => {
    const invented = { ...model, scores: { ...model.scores, coherence: score(3, ["algo que nunca dijo"]) } };
    const a = buildAssessment({ form: jose, history, modelAssessment: invented, model: "test" });
    expect(a.scores.coherence.score).toBe(1);
    expect(a.route).toBe("human_review");
  });

  it("no trade → not_assessed and training", () => {
    const a = buildAssessment({ form: { trade: null }, history, modelAssessment: model, model: "test" });
    expect(a.demonstratedLevel).toBe("not_assessed");
    expect(a.trust).toBe("declared");
    expect(a.route).toBe("training");
  });

  it("tools checks come from code only", () => {
    const withTools = { ...model, pendingChecks: [...model.pendingChecks, { kind: "tools" as const, detail: "x" }] };
    const a = buildAssessment({ form: { ...jose, tools: undefined }, history, modelAssessment: withTools, model: "test" });
    expect(a.pendingChecks.filter((c) => c.kind === "tools")).toHaveLength(1);
    expect(a.pendingChecks.find((c) => c.kind === "tools")?.detail).not.toBe("x");
  });
});
