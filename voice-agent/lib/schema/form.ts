import { z } from "zod";

export const YearsBand = z.enum(["lt1", "1to3", "3to10", "gt10"]);

export const Form = z.object({
  intakeId: z.uuid(),
  name: z.string().min(1),
  lastNames: z.string().optional(),          // apellidos dentro de `name`, para separar nombres y apellidos al guardar
  idStatus: z.enum(["valid", "expired", "lost", "none"]).optional(),   // la demo corta no la pregunta
  idNumber: z.string().optional(),          // dato sensible: almacenamiento restringido
  birthDate: z.iso.date().optional(),
  phone: z.string().optional(),
  // No se preguntan en la demo: opcionales para que un registro de demo sea válido
  sector: z.enum(["ciudad_piar", "catia_la_mar", "la_lucha", "other"]).optional(),
  housing: z.enum(["shelter", "own_good", "own_damaged", "rented", "relative"]).optional(),
  education: z.enum(["none", "primary", "secondary", "technical", "university"]).optional(),
  courses: z.string().optional(),
  mobility: z.enum(["outside_ok", "only_la_guaira", "depends_transport"]).optional(),
  trade: z.string().nullable(),             // null = sin oficio / quiere aprender uno
  yearsBand: YearsBand.optional(),
  otherSkills: z.array(z.string()).max(2).optional(),
  tools: z.enum(["has", "lost", "never_had"]).optional(),   // opcional: solo se captura si la persona lo menciona
  seeking: z.enum(["employment", "own_business", "freelance"]).optional(),
  reference: z.string().optional(),         // quién puede dar fe de su trabajo, como lo dijo; se contacta después
});

// Durante la conversación todos los campos son opcionales
export const FormDraft = Form.partial();

export type YearsBand = z.infer<typeof YearsBand>;
export type Form = z.infer<typeof Form>;
export type FormDraft = z.infer<typeof FormDraft>;
