// Llamadas a Claude: Haiku para cada turno, Sonnet para la evaluación final (PRD sección 7)
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ASSESS_SYSTEM, TURN_SYSTEM, assessUserMessage, turnUserMessage } from "@/lib/agent/prompts";
import type { Extractor, Line } from "@/lib/agent/stage";
import { ModelAssessment } from "@/lib/schema/assessment";
import { Extraction } from "@/lib/schema/extraction";
import type { FormDraft } from "@/lib/schema/form";

export const TURN_MODEL = "claude-haiku-5-5";
export const ASSESS_MODEL = "claude-sonnet-5-5";

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

// Devuelve null si Claude falla o se niega: el turno sigue sin datos nuevos
export const extractTurn: Extractor = async ({ question, answer }) => {
  try {
    const response = await getClient().messages.parse({
      model: TURN_MODEL,
      max_tokens: 2048,
      // Voz: baja latencia
      output_config: { effort: "low", format: zodOutputFormat(Extraction) },
      system: TURN_SYSTEM,
      messages: [{ role: "user", content: turnUserMessage(question, answer) }],
    });
    if (response.stop_reason === "refusal") {
      console.warn("[extractTurn] refusal", response.stop_details?.category);
      return null;
    }
    return response.parsed_output;
  } catch (error) {
    console.error("[extractTurn]", error instanceof Error ? error.message : error);
    return null;
  }
};

export class AssessmentError extends Error {}

// Si la salida no pasa el esquema, reintenta una vez con los errores en el prompt
export async function assessConversation(form: FormDraft, history: Line[]): Promise<ModelAssessment> {
  const content = assessUserMessage(form, history);
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNote = lastError
      ? `\n\n## Corrección\nTu respuesta anterior no pasó la validación: ${lastError}. Corrígela.`
      : "";
    try {
      const response = await getClient().beta.messages.parse({
        model: ASSESS_MODEL,
        max_tokens: 16000,
        // Si un clasificador de seguridad declina, el servidor reintenta con otro modelo
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high", format: betaZodOutputFormat(ModelAssessment) },
        system: ASSESS_SYSTEM,
        messages: [{ role: "user", content: content + retryNote }],
      });
      if (response.stop_reason === "refusal") {
        throw new AssessmentError(`refusal: ${response.stop_details?.category ?? "unknown"}`);
      }
      const parsed = ModelAssessment.safeParse(response.parsed_output);
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
    } catch (error) {
      // Errores de la API o negativas no se reintentan aquí; el SDK ya reintenta 429/5xx
      if (error instanceof Anthropic.APIError || error instanceof AssessmentError) throw error;
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new AssessmentError(`invalid assessment after retry: ${lastError}`);
}
