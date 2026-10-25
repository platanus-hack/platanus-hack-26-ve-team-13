// Un turno de la conversación. Sin estado: el cliente envía y recibe el TurnState.
import { z } from "zod";
import { extractTurn } from "@/lib/agent/claude";
import { TurnState, runTurn, type Extractor } from "@/lib/agent/stage";

const TurnRequest = z.object({
  state: TurnState,
  userText: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const body = TurnRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: z.prettifyError(body.error) }, { status: 400 });
  }

  // Si Claude falla, el turno sigue con la pregunta fija y sin datos nuevos
  let degraded = false;
  const extract: Extractor = async (input) => {
    const result = await extractTurn(input);
    degraded = result === null;
    return result;
  };

  const result = await runTurn(body.data.state, body.data.userText, extract);
  return Response.json({ ...result, degraded });
}
