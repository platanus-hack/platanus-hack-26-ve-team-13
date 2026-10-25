// Token de un solo uso para que el navegador se conecte a Scribe sin ver la clave de ElevenLabs
export async function POST() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "stt_not_configured" }, { status: 503 });

  const r = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": key },
  }).catch(() => null);

  if (!r?.ok) {
    // Por ejemplo, la clave no tiene el permiso speech_to_text
    console.error("[scribe-token]", r?.status, await r?.text().catch(() => ""));
    return Response.json({ error: "token_failed" }, { status: 502 });
  }
  const { token } = (await r.json()) as { token: string };
  return Response.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
