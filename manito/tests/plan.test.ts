import { describe, expect, it } from "vitest";
import { VOUCH_LATER } from "@/lib/agent/lines";
import { buildQuestionPlan } from "@/lib/agent/plan";
import { findTrade, TRADES } from "@/lib/agent/trades";

describe("findTrade", () => {
  it("matches id and spoken names, ignoring accents and case", () => {
    expect(findTrade("masonry")?.id).toBe("masonry");
    expect(findTrade("Albañil")?.id).toBe("masonry");
    expect(findTrade("albanil")?.id).toBe("masonry");
    expect(findTrade(" Costurera ")?.id).toBe("sewing");
    expect(findTrade("Programadora")?.id).toBe("programming");
    expect(findTrade("desarrollador web")?.id).toBe("programming");
    expect(findTrade("Recepcionista")?.id).toBe("reception");
    expect(findTrade("recepción")?.id).toBe("reception");
  });

  it("returns undefined for a trade not in the bank", () => {
    expect(findTrade("panadero")).toBeUndefined();
  });
});

describe("TRADES", () => {
  it("has masonry, reception and programming in depth plus light trades", () => {
    expect(TRADES.find((t) => t.id === "masonry")?.depth).toBe("full");
    expect(TRADES.find((t) => t.id === "reception")?.depth).toBe("full");
    expect(TRADES.find((t) => t.id === "programming")?.depth).toBe("full");
    expect(TRADES.filter((t) => t.depth === "light").length).toBeGreaterThanOrEqual(2);
  });

  it("every trade has a follow-up per level and tools", () => {
    for (const t of TRADES) {
      expect(Object.keys(t.followUps).sort()).toEqual(["basic", "expert", "intermediate"]);
      expect(t.tools.length).toBeGreaterThan(0);
      expect(t.expectedSteps.length).toBeGreaterThan(0);
    }
  });
});

describe("buildQuestionPlan", () => {
  it("short flow → only who can vouch, with the trade's own wording", () => {
    const plan = buildQuestionPlan({ trade: "reception", yearsBand: "gt10" }, "short");
    expect(plan.questions).toEqual([{
      id: 22,
      text: `¿Alguien de donde trabajabas te podría recomendar, como un doctor, tu jefe o un compañero? ${VOUCH_LATER}`,
      criterion: "externalEvidence",
    }]);
    expect(buildQuestionPlan({ trade: null }, "short").questions).toEqual([]);
  });

  it("reception + >10 years → the demo script's questions", () => {
    const plan = buildQuestionPlan({ trade: "reception", yearsBand: "gt10" });
    expect(plan.questions.map((q) => q.text)).toEqual([
      "Cuéntame paso a paso cómo atiendes a una persona que llega a la recepción.",
      "¿Cómo manejas a alguien que llega molesto y exige que lo atiendan ya?",
      "¿Alguien de donde trabajabas te podría recomendar, como un doctor, tu jefe o un compañero?",
    ]);
  });

  it("masonry + >10 years → expert-level follow-up, as in the demo script", () => {
    const plan = buildQuestionPlan({ trade: "masonry", yearsBand: "gt10" });
    expect(plan.followUpLevel).toBe("expert");
    expect(plan.questions.map((q) => q.id)).toEqual([18, 19, 22]);
    expect(plan.questions[0].text).toBe("Cuéntame paso a paso cómo frisas una pared.");
    expect(plan.questions[1].text).toBe("¿Y qué haces si la mezcla te queda muy aguada?");
    expect(plan.questions[2].text).toBe("¿Alguien puede dar fe de tu trabajo?");
  });

  it("<1 year → basic follow-up", () => {
    const plan = buildQuestionPlan({ trade: "albañil", yearsBand: "lt1" });
    expect(plan.followUpLevel).toBe("basic");
    expect(plan.questions[1].text).toBe(findTrade("masonry")!.followUps.basic);
  });

  it("programmer + >10 years → bug-fixing task and expert follow-up", () => {
    const plan = buildQuestionPlan({ trade: "programador", yearsBand: "gt10" });
    expect(plan.trade?.id).toBe("programming");
    expect(plan.questions[0].text).toBe(
      "Cuéntame paso a paso cómo arreglas un error que te reporta un cliente en su aplicación.",
    );
    expect(plan.questions[1].text).toBe(findTrade("programming")!.followUps.expert);
  });

  it("3–10 years → intermediate follow-up", () => {
    expect(buildQuestionPlan({ trade: "electricista", yearsBand: "3to10" }).followUpLevel).toBe("intermediate");
  });

  it("no trade → no technical questions", () => {
    const plan = buildQuestionPlan({ trade: null, yearsBand: "gt10" });
    expect(plan.trade).toBeNull();
    expect(plan.questions).toEqual([]);
  });

  it("trade not in the bank → generic questions that name the trade", () => {
    const plan = buildQuestionPlan({ trade: "panadero", yearsBand: "1to3" });
    expect(plan.trade).toBeNull();
    expect(plan.questions.map((q) => q.id)).toEqual([18, 19, 22]);
    expect(plan.questions[0].text).toContain("panadero");
  });

  it("unknown years → basic follow-up", () => {
    expect(buildQuestionPlan({ trade: "masonry" }).followUpLevel).toBe("basic");
  });
});
