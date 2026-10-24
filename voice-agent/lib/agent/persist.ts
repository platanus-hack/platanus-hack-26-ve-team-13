import type { Assessment } from "@/lib/schema/assessment";
import type { Form } from "@/lib/schema/form";

export type Intake = { form: Form; assessment: Assessment };

// The only boundary with Oli's code. Mock for now: at integration this calls
// his middleware instead (see INTEGRATION.md).
export async function persistIntake(intake: Intake): Promise<{ intakeId: string }> {
  console.info("[persistIntake:mock]", intake.form.intakeId, intake.assessment.route);
  return { intakeId: intake.form.intakeId };
}
