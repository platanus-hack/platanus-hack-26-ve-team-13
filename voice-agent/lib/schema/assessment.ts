import { z } from "zod";

const Score = z.object({
  score: z.number().int().min(0).max(3),
  quotes: z.array(z.string()).max(3),       // verbatim from the transcript
  reason: z.string(),
});

export const ModelAssessment = z.object({  // what Claude returns
  scores: z.object({
    specificity: Score,
    knowledge: Score,
    coherence: Score,
    externalEvidence: Score,
  }),
  demonstratedLevel: z.enum(["basic", "intermediate", "expert", "not_assessed"]),
  observations: z.array(z.string()).min(1).max(3),
  toolsNeeded: z.array(z.string()),
  pendingChecks: z.array(z.object({
    kind: z.enum(["reference", "photo", "rif"]),
    detail: z.string(),
  })),
});

export const Assessment = ModelAssessment.extend({  // what code adds
  levelVsYears: z.enum(["matches", "below", "above", "not_assessed"]),
  trust: z.enum(["declared", "probed", "with_reference", "verified"]),
  route: z.enum(["human_review", "training", "ready_with_support", "ready_to_match"]),
  model: z.string(),
  assessedAt: z.iso.datetime(),
});

export type ModelAssessment = z.infer<typeof ModelAssessment>;
export type Assessment = z.infer<typeof Assessment>;
