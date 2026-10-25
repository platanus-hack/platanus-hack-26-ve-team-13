import { toDomain } from "@/lib/agent/toDomain";
import type { Assessment } from "@/lib/schema/assessment";
import type { Form } from "@/lib/schema/form";

export type Intake = { form: Form; assessment: Assessment };

// Mock por ahora: arma Persona y Perfil en el formato de Oli y solo los registra.
// En la integración esto llama a la ruta de Oli que escribe en Supabase y Mongo (ver INTEGRATION.md).
export async function persistIntake(intake: Intake): Promise<{ intakeId: string }> {
  const { persona, perfil } = toDomain(intake.form, intake.assessment);
  console.info("[persistIntake:mock]", persona.id, perfil.validacion_tecnica_ia.evaluacion_detallada?.ruta);
  return { intakeId: persona.id };
}
