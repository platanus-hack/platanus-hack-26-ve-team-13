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

// Cola de frases para generar por adelantado, de a una para no pasar el límite de
// pedidos simultáneos de ElevenLabs y dejar lugar a lo que se va a decir ya
const queue: string[] = [];
let prefetching = false;

function pump(): void {
  if (prefetching) return;
  const next = queue.shift();
  if (next === undefined) return;
  if (cache.has(next)) return pump();
  prefetching = true;
  void fetchAudio(next).finally(() => { prefetching = false; pump(); });
}

// Pone en cola el audio de frases que se van a decir más adelante
export function prefetch(texts: string[]): void {
  for (const t of texts.map(speakable)) {
    if (t && !cache.has(t) && !queue.includes(t)) queue.push(t);
  }
  pump();
}

// Pide ya el audio de frases que probablemente se digan en segundos (sin pasar por la cola)
export function warm(texts: string[]): void {
  for (const t of texts) if (t) void fetchAudio(speakable(t));
}

export function clearCache(): void {
  cache.clear();
  queue.length = 0;
}

let finishCurrent: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;
let generation = 0; // cambia en stopSpeaking(), para cortar una secuencia de partes

// Corta lo que esté sonando; la promesa de speak() se resuelve
export function stopSpeaking(): void {
  generation++;
  currentAudio?.pause();
  currentAudio = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  finishCurrent?.();
  finishCurrent = null;
}

function play(blob: Blob, onPlay: () => void): Promise<boolean> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  return new Promise<boolean>((resolve) => {
    finishCurrent = () => resolve(true);
    audio.onplay = onPlay;
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  }).finally(() => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  });
}

// Dice las partes seguidas y se resuelve cuando termina (o cuando se corta con stopSpeaking).
// El audio de todas se pide a la vez; las fijas ya suelen estar en caché.
export async function speak(
  parts: string | string[],
  opts: { enabled?: boolean; onStart?: (source: VoiceSource) => void } = {},
): Promise<VoiceSource> {
  stopSpeaking();
  const gen = generation;
  if (opts.enabled === false) {
    opts.onStart?.("silent");
    return "silent";
  }

  const spoken = (Array.isArray(parts) ? parts : [parts]).map(speakable).filter(Boolean);
  const audios = spoken.map(fetchAudio);
  let started = false;
  const onPlay = () => {
    if (!started) opts.onStart?.("elevenlabs");
    started = true;
  };

  for (let i = 0; i < spoken.length; i++) {
    const blob = await audios[i];
    if (gen !== generation) return "elevenlabs";
    // Sin audio de ElevenLabs: lo que falta lo dice la voz del navegador
    if (!blob || !(await play(blob, onPlay))) {
      if (gen !== generation) return "elevenlabs";
      return speakWithBrowser(spoken.slice(i).join(" "), started ? undefined : opts.onStart);
    }
    if (gen !== generation) break;
  }
  return "elevenlabs";
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
