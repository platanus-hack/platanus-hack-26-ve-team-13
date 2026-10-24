import type { Assessment } from "@/lib/schema/assessment";
import type { Form } from "@/lib/schema/form";

export type Intake = { form: Form; assessment: Assessment };

// Mock form por ahora ! :en integracion esto llama al middleware at integration this calls
//  (see INTEGRATION.md).
export async function persistIntake(intake: Intake): Promise<{ intakeId: string }> {
  console.info("[persistIntake:mock]", intake.form.intakeId, intake.assessment.route);
  return { intakeId: intake.form.intakeId };
}
