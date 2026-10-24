import { describe, expect, it } from "vitest";
import { Assessment, ModelAssessment } from "@/lib/schema/assessment";
import { Form, FormDraft } from "@/lib/schema/form";

// José, la persona inventada de la demo (PRD sección 5)
const jose = {
  intakeId: "3f1c2a7e-8b4d-4e6a-9c1f-2d5b7a9e0c13",
  name: "José Rodríguez",
  idStatus: "valid",
  idNumber: "V-15234876",
  birthDate: "1980-03-03",
  phone: "04125551234",
  trade: "masonry",
  yearsBand: "gt10",
  tools: "lost",
};

const score = (n: number) => ({ score: n, quotes: ["Le frisé la casa el año pasado."], reason: "r" });

const modelAssessment = {
  scores: {
    specificity: score(2),
    knowledge: score(3),
    coherence: score(3),
    externalEvidence: score(2),
  },
  demonstratedLevel: "expert",
  observations: ["Explains rendering a wall in detail; says >10 years and the level confirms it."],
  toolsNeeded: ["cuchara", "llana", "nivel"],
  pendingChecks: [{ kind: "reference", detail: "señora Carmen, Catia La Mar" }],
};

describe("Form", () => {
  it("accepts the demo record with the unasked fields empty", () => {
    expect(Form.safeParse(jose).success).toBe(true);
  });

  it("accepts a null trade (no trade / wants to learn)", () => {
    expect(Form.safeParse({ ...jose, trade: null }).success).toBe(true);
  });

  it("rejects a non-ISO birth date", () => {
    expect(Form.safeParse({ ...jose, birthDate: "3 de marzo de 1980" }).success).toBe(false);
  });

  it("accepts an empty draft mid-conversation", () => {
    expect(FormDraft.safeParse({}).success).toBe(true);
  });
});

describe("ModelAssessment", () => {
  it("accepts the expected demo assessment", () => {
    expect(ModelAssessment.safeParse(modelAssessment).success).toBe(true);
  });

  it.each([-1, 4, 2.5])("rejects score %s", (n) => {
    const bad = { ...modelAssessment, scores: { ...modelAssessment.scores, knowledge: score(n) } };
    expect(ModelAssessment.safeParse(bad).success).toBe(false);
  });

  it("rejects a score without a quotes array", () => {
    const bad = {
      ...modelAssessment,
      scores: { ...modelAssessment.scores, coherence: { score: 3, reason: "r" } },
    };
    expect(ModelAssessment.safeParse(bad).success).toBe(false);
  });
});

describe("Assessment", () => {
  it("accepts the model output plus the code-computed fields", () => {
    const full = {
      ...modelAssessment,
      levelVsYears: "matches",
      trust: "with_reference",
      route: "ready_with_support",
      model: "claude-sonnet-5-5",
      assessedAt: "2026-10-24T18:00:00Z",
    };
    expect(Assessment.safeParse(full).success).toBe(true);
  });
});
