import { Perfil } from "@/domain/classes/Perfil";
import { Persona } from "@/domain/classes/Persona";
import { toDomain } from "@/lib/agent/toDomain";
import type { Assessment } from "@/lib/schema/assessment";
import type { Form } from "@/lib/schema/form";

export type Intake = { form: Form; assessment: Assessment };

const dbConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.MONGODB_URI);

// Arma Persona y Perfil en el formato de Oli y los guarda con su servicio (Supabase + Mongo).
// Sin credenciales de base solo los registra, para que /demo funcione en local.
// Devuelve el id que genera Supabase, que reemplaza al intakeId del agente.
export async function persistIntake(intake: Intake): Promise<{ intakeId: string }> {
  const { persona, perfil } = toDomain(intake.form, intake.assessment);
  if (!dbConfigured()) {
    console.info("[persistIntake:mock]", persona.id, perfil.validacion_tecnica_ia.evaluacion_detallada?.ruta);
    return { intakeId: persona.id };
  }
  // Import diferido: el servicio crea los clientes al cargarse y fallan sin las variables
  console.info("[persist] enviando a sendDatabaseRequest", { nombres: persona.nombres, apellidos: persona.apellidos });
  const { sendDatabaseRequest } = await import("@/utils/supabase/service");
  const res = await sendDatabaseRequest({ Persona: new Persona(persona), Perfil: new Perfil(perfil) });
  const body = await res.json();
  console.info("[persist] respuesta", res.status, body);
  if (!res.ok) throw new Error(body.error ?? `registro ${res.status}`);
  return { intakeId: body.persona_id };
}
