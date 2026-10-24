import { describe, expect, it } from "vitest";
import {
  capUnquotedScores,
  codePendingChecks,
  deriveRoute,
  deriveTrust,
  expectedLevel,
  levelVsYears,
  type Scores,
} from "@/lib/agent/rules";
import type { FormDraft } from "@/lib/schema/form";

const s = (n: number, quotes = ["cita"]) => ({ score: n, quotes, reason: "r" });

function scores(specificity: number, knowledge: number, coherence: number, externalEvidence: number): Scores {
  return {
    specificity: s(specificity),
    knowledge: s(knowledge),
    coherence: s(coherence),
    externalEvidence: s(externalEvidence),
  };
}

// José de la demo, antes de variar herramientas y cédula
const mason: FormDraft = { trade: "masonry", yearsBand: "gt10", idStatus: "valid", tools: "has" };

describe("capUnquotedScores", () => {
  it("caps a score above 1 that has no quotes", () => {
    const capped = capUnquotedScores({ ...scores(3, 3, 3, 3), knowledge: s(3, []) });
    expect(capped.knowledge.score).toBe(1);
    expect(capped.specificity.score).toBe(3);
  });

  it("leaves scores of 0 or 1 without quotes alone", () => {
    const capped = capUnquotedScores({ ...scores(3, 3, 3, 3), externalEvidence: s(0, []) });
    expect(capped.externalEvidence.score).toBe(0);
  });
});

describe("deriveTrust", () => {
  it("knowledge 2 + coherence 2 + evidence 0 → probed", () => {
    expect(deriveTrust(scores(0, 2, 2, 0), "intermediate")).toBe("probed");
  });

  it("probed + evidence 2 → with_reference", () => {
    expect(deriveTrust(scores(0, 2, 2, 2), "intermediate")).toBe("with_reference");
  });

  it("low knowledge or coherence → declared", () => {
    expect(deriveTrust(scores(3, 1, 3, 3), "basic")).toBe("declared");
    expect(deriveTrust(scores(3, 3, 1, 3), "expert")).toBe("declared");
  });

  it("knowledge not tested → declared", () => {
    expect(deriveTrust(scores(3, 3, 3, 3), "not_assessed")).toBe("declared");
  });

  it("never returns verified", () => {
    for (let k = 0; k <= 3; k++)
      for (let c = 0; c <= 3; c++)
        for (let e = 0; e <= 3; e++)
          expect(deriveTrust(scores(3, k, c, e), "expert")).not.toBe("verified");
  });
});

describe("expectedLevel / levelVsYears", () => {
  it("maps years to the PRD table", () => {
    expect(expectedLevel("lt1")).toEqual(["basic", "basic"]);
    expect(expectedLevel("1to3")).toEqual(["basic", "intermediate"]);
    expect(expectedLevel("3to10")).toEqual(["intermediate", "intermediate"]);
    expect(expectedLevel("gt10")).toEqual(["intermediate", "expert"]);
  });

  it("expert with >10 → matches", () => {
    expect(levelVsYears("expert", "gt10")).toBe("matches");
  });

  it("basic with >10 → below", () => {
    expect(levelVsYears("basic", "gt10")).toBe("below");
  });

  it("expert with <1 → above", () => {
    expect(levelVsYears("expert", "lt1")).toBe("above");
  });

  it("not assessed or unknown years → not_assessed", () => {
    expect(levelVsYears("not_assessed", "gt10")).toBe("not_assessed");
    expect(levelVsYears("expert", undefined)).toBe("not_assessed");
  });
});

describe("deriveRoute", () => {
  it("coherence 1 → human_review even with high other scores", () => {
    expect(deriveRoute(mason, scores(3, 3, 1, 3), "with_reference")).toBe("human_review");
  });

  it("knowledge ≤ 1 with >3 declared years → human_review", () => {
    expect(deriveRoute(mason, scores(1, 1, 2, 0), "declared")).toBe("human_review");
    expect(deriveRoute({ ...mason, yearsBand: "3to10" }, scores(1, 1, 2, 0), "declared")).toBe("human_review");
  });

  it("trade null → training", () => {
    expect(deriveRoute({ trade: null, idStatus: "valid" }, scores(0, 0, 0, 0), "declared")).toBe("training");
  });

  it("human_review takes precedence over ready_with_support", () => {
    expect(deriveRoute({ ...mason, tools: "lost" }, scores(3, 3, 1, 3), "with_reference")).toBe("human_review");
  });

  it("lost tools → ready_with_support", () => {
    expect(deriveRoute({ ...mason, tools: "lost" }, scores(2, 3, 3, 2), "with_reference")).toBe("ready_with_support");
  });

  it("never had tools → ready_with_support", () => {
    expect(deriveRoute({ ...mason, tools: "never_had" }, scores(2, 3, 3, 2), "probed")).toBe("ready_with_support");
  });

  it("no valid ID → ready_with_support", () => {
    expect(deriveRoute({ ...mason, idStatus: "lost" }, scores(2, 3, 3, 2), "probed")).toBe("ready_with_support");
  });

  it("has tools and valid ID → ready_to_match", () => {
    expect(deriveRoute(mason, scores(2, 3, 3, 2), "probed")).toBe("ready_to_match");
  });

  it("tools unknown → not counted as missing", () => {
    expect(deriveRoute({ ...mason, tools: undefined }, scores(2, 3, 3, 2), "probed")).toBe("ready_to_match");
  });

  it("trade not confirmed (declared trust, few years) → human_review", () => {
    expect(deriveRoute({ ...mason, yearsBand: "1to3" }, scores(1, 1, 2, 0), "declared")).toBe("human_review");
  });

  it("the demo profile → ready_with_support", () => {
    const form: FormDraft = { ...mason, tools: "lost" };
    const sc = scores(2, 3, 3, 2);
    const trust = deriveTrust(sc, "expert");
    expect(trust).toBe("with_reference");
    expect(deriveRoute(form, sc, trust)).toBe("ready_with_support");
  });
});

describe("codePendingChecks", () => {
  it("tools unknown → asks about tools", () => {
    expect(codePendingChecks({ ...mason, tools: undefined })).toEqual([
      { kind: "tools", detail: expect.any(String) },
    ]);
  });

  it("tools known or no trade → nothing to add", () => {
    expect(codePendingChecks(mason)).toEqual([]);
    expect(codePendingChecks({ trade: null })).toEqual([]);
  });
});
