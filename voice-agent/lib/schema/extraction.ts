import { z } from "zod";
import { Form, YearsBand } from "@/lib/schema/form";

// Campos que la persona puede negarse a dar
export const DeclinableField = z.enum(["name", "birthDate", "idStatus", "idNumber", "phone", "trade", "yearsBand"]);

// Lo que devuelve Claude en cada turno. null = no lo dijo en esta respuesta.
// Fechas y números son la mejor interpretación de Claude; el código los valida
// y Manito los lee de vuelta para que la persona los confirme.
export const Extraction = z.object({
  ack: z.string(),                            // acuse breve antes de la siguiente pregunta; puede ser ""
  name: z.string().nullable(),
  birthDate: z.string().nullable(),
  idStatus: Form.shape.idStatus.nullable(),
  idNumber: z.string().nullable(),
  phone: z.string().nullable(),
  trade: z.string().nullable(),
  noTrade: z.boolean(),                       // no tenía oficio o quiere aprender uno
  yearsBand: YearsBand.nullable(),
  tools: z.enum(["has", "lost", "never_had"]).nullable(),
  confirmed: z.boolean().nullable(),          // respuesta a "¿Está bien?"; null si no aplica o no se entiende
  // "question": pregunta algo o se sale del tema en vez de responder;
  // "distress": peligro o necesidad urgente ahora mismo. null si responde normal.
  offScript: z.enum(["question", "distress"]).nullable(),
  declined: z.array(DeclinableField),
  evidenceNotes: z.array(z.string()).max(3),  // etiquetas cortas para el panel, no puntajes
});

export type DeclinableField = z.infer<typeof DeclinableField>;
export type Extraction = z.infer<typeof Extraction>;
