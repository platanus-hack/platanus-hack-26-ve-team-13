// Texto → audio con ElevenLabs. La clave queda en el servidor; el navegador solo recibe el MP3.
import { z } from "zod";

const TtsRequest = z.object({ text: z.string().trim().min(1).max(800) });

// Flash v2.5: el más rápido en terminar una frase corta (medido ~0,55 s)
const DEFAULT_MODEL = "eleven_flash_v2_5";

export async function POST(request: Request) {
  const body = TtsRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid_text" }, { status: 400 });

  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) return Response.json({ error: "tts_not_configured" }, { status: 503 });

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: body.data.text, model_id: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL }),
    },
  ).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    console.error("[tts]", upstream?.status, await upstream?.text().catch(() => ""));
    return Response.json({ error: "tts_failed" }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
