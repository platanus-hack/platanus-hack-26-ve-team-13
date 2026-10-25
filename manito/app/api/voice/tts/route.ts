// Texto → audio con ElevenLabs. La clave queda en el servidor; el navegador solo recibe el MP3.
import { z } from "zod";

const TtsRequest = z.object({ text: z.string().trim().min(1).max(800) });

// Flash v2.5: el más rápido en terminar una frase corta (medido ~0,55 s)
const DEFAULT_MODEL = "eleven_flash_v2_5";
// Velocidad de Manito (ElevenLabs acepta 0,7 a 1,2). Pisa la guardada en la voz.
const DEFAULT_SPEED = 1.1;
const RETRY_AFTER_MS = 300;

// Ajustes guardados en la voz (estabilidad, estilo…), pedidos una vez por voz:
// si se manda solo la velocidad, el resto vuelve a los valores por defecto de ElevenLabs
const savedSettings = new Map<string, Promise<Record<string, unknown>>>();

function voiceSettings(voice: string, key: string): Promise<Record<string, unknown>> {
  let settings = savedSettings.get(voice);
  if (!settings) {
    settings = fetch(`https://api.elevenlabs.io/v1/voices/${voice}/settings`, { headers: { "xi-api-key": key } })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    savedSettings.set(voice, settings);
  }
  const speed = Number(process.env.ELEVENLABS_SPEED) || DEFAULT_SPEED;
  return settings.then((s) => ({ ...s, speed }));
}

export async function POST(request: Request) {
  const body = TtsRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid_text" }, { status: 400 });

  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice) return Response.json({ error: "tts_not_configured" }, { status: 503 });

  const synthesize = async () => fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: body.data.text,
        model_id: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
        voice_settings: await voiceSettings(voice, key),
      }),
    },
  ).catch(() => null);

  let upstream = await synthesize();
  // 429: demasiados pedidos a la vez (el audio que se genera por adelantado); se reintenta una vez
  if (upstream?.status === 429) {
    await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
    upstream = await synthesize();
  }

  if (!upstream?.ok || !upstream.body) {
    console.error("[tts]", upstream?.status, await upstream?.text().catch(() => ""));
    return Response.json({ error: "tts_failed" }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
