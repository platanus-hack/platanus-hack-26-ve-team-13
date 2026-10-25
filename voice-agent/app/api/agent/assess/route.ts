// Evaluación final y entrega a persistIntake()
import { z } from "zod";
import { buildAssessment, buildUnscoredAssessment } from "@/lib/agent/assess";
import { ASSESS_MODEL, assessConversation } from "@/lib/agent/claude";
import { persistIntake } from "@/lib/agent/persist";
import { Flow, Line } from "@/lib/agent/stage";
import { Form, FormDraft } from "@/lib/schema/form";

const AssessRequest = z.object({
  form: FormDraft,
  history: z.array(Line).min(1),
  needsHuman: z.boolean().default(false),   // TurnState.needsHuman
  flow: Flow.default("full"),               // TurnState.flow
});

export async function POST(request: Request) {
  const body = AssessRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }
  const { form, history, needsHuman, flow } = body.data;

  let assessment;
  if (flow === "short") {
    // La demo corta no pregunta por el oficio: no hay nada que evaluar con el modelo
    assessment = buildUnscoredAssessment({ form, needsHuman });
  } else try {
    const modelAssessment = await assessConversation(form, history);
    assessment = buildAssessment({ form, history, modelAssessment, model: ASSESS_MODEL, needsHuman });
  } catch (error) {
    console.error("[assess]", error);
    return Response.json({ error: "assessment_failed" }, { status: 502 });
  }

  // Si faltan datos obligatorios (por ejemplo, la persona no dio su nombre),
  // se muestra la evaluación pero no se guarda
  const fullForm = Form.safeParse({ ...form, intakeId: form.intakeId ?? crypto.randomUUID() });
  if (!fullForm.success) {
    return Response.json({ assessment, persisted: false, formErrors: z.prettifyError(fullForm.error) });
  }
  await persistIntake({ form: fullForm.data, assessment });
  return Response.json({ assessment, persisted: true });
}
