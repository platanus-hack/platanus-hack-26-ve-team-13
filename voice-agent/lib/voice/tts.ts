// Voz de Manito en el navegador: ElevenLabs vía /api/voice/tts, o la voz del navegador si falla.
// Los números se dicen en palabras (speakable); la pantalla sigue mostrando los dígitos.
import { speakable } from "@/lib/voice/spoken";

export type VoiceSource = "elevenlabs" | "browser" | "silent";

// Audio ya pedido, por texto: las frases fijas y los acuses se repiten
const cache = new Map<string, Promise<Blob | null>>();

function fetchAudio(text: string): Promise<Blob | null> {
  let audio = cache.get(text);
  if (!audio) {
    audio = fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    cache.set(text, audio);
    // Si falló, que el próximo intento vuelva a pedirlo
    audio.then((b) => { if (!b) cache.delete(text); });
  }
  return audio;
}

// Pide el audio por adelantado (por ejemplo, el saludo antes de empezar)
export function prefetch(text: string): void {
  void fetchAudio(speakable(text));
}

export function clearCache(): void {
  cache.clear();
}

let finishCurrent: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;

// Corta lo que esté sonando; la promesa de speak() se resuelve
export function stopSpeaking(): void {
  currentAudio?.pause();
  currentAudio = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  finishCurrent?.();
  finishCurrent = null;
}

// Habla y se resuelve cuando termina (o cuando se corta con stopSpeaking)
export async function speak(
  text: string,
  opts: { enabled?: boolean; onStart?: (source: VoiceSource) => void } = {},
): Promise<VoiceSource> {
  stopSpeaking();
  if (opts.enabled === false) {
    opts.onStart?.("silent");
    return "silent";
  }

  const spoken = speakable(text);
  const blob = await fetchAudio(spoken);
  if (blob) {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    const played = await new Promise<boolean>((resolve) => {
      finishCurrent = () => resolve(true);
      audio.onplay = () => opts.onStart?.("elevenlabs");
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
    if (played) return "elevenlabs";
  }
  return speakWithBrowser(spoken, opts.onStart);
}

function speakWithBrowser(text: string, onStart?: (source: VoiceSource) => void): Promise<VoiceSource> {
  if (typeof speechSynthesis === "undefined") {
    onStart?.("silent");
    return Promise.resolve("silent");
  }
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-VE";
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
    if (voice) u.voice = voice;
    finishCurrent = () => resolve("browser");
    u.onstart = () => onStart?.("browser");
    u.onend = u.onerror = () => resolve("browser");
    speechSynthesis.speak(u);
  });
}
