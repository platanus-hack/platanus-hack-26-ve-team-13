import { z } from "zod";

export const YearsBand = z.enum(["lt1", "1to3", "3to10", "gt10"]);

export const Form = z.object({
  intakeId: z.uuid(),
  name: z.string().min(1),
  idStatus: z.enum(["valid", "expired", "lost", "none"]),
  idNumber: z.string().optional(),          // sensitive: restricted storage
  birthDate: z.iso.date().optional(),
  phone: z.string().optional(),
  // Not asked in the demo: optional so a demo record is valid
  sector: z.enum(["ciudad_piar", "catia_la_mar", "la_lucha", "other"]).optional(),
  housing: z.enum(["shelter", "own_good", "own_damaged", "rented", "relative"]).optional(),
  education: z.enum(["none", "primary", "secondary", "technical", "university"]).optional(),
  courses: z.string().optional(),
  mobility: z.enum(["outside_ok", "only_la_guaira", "depends_transport"]).optional(),
  trade: z.string().nullable(),             // null = no trade / wants to learn
  yearsBand: YearsBand.optional(),
  otherSkills: z.array(z.string()).max(2).optional(),
  tools: z.enum(["has", "lost", "never_had"]).optional(),   // optional: captured only if mentioned
  seeking: z.enum(["employment", "own_business", "freelance"]).optional(),
});

// During the conversation every field is optional
export const FormDraft = Form.partial();

export type YearsBand = z.infer<typeof YearsBand>;
export type Form = z.infer<typeof Form>;
export type FormDraft = z.infer<typeof FormDraft>;
