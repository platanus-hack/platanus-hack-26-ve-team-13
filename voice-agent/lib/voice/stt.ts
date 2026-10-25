// Micrófono → texto con el reconocimiento de voz del navegador (Chrome).
// Escucha de forma continua y da la respuesta por terminada tras un silencio.

// El DOM de TypeScript no trae estos tipos; solo lo que usamos
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechRecognitionSupported = () => getCtor() !== undefined;

// Si el navegador no tiene español de Venezuela, se prueba con los siguientes
const LANGS = ["es-VE", "es-US", "es-MX"];

// Pausa corta tras la que se avisa onPause, antes de que el silencio cierre la respuesta
export const PAUSE_MS = 600;

export type ListenerOptions = {
  silenceMs: number;                     // silencio que cierra la respuesta (si start() no indica otro)
  onInterim: (text: string) => void;     // lo que va entendiendo, para mostrarlo
  onPause?: (text: string) => void;      // tras PAUSE_MS sin hablar: la respuesta probablemente terminó
  onFinal: (text: string) => void;       // la respuesta completa
  onError: (message: string) => void;
  onEngineChange?: (engine: "scribe" | "browser") => void;
};

// Lo que la página necesita de cualquier reconocedor (Scribe o el del navegador)
export interface SpeechListener {
  readonly engine: "scribe" | "browser";
  start(silenceMs?: number): void;
  sendNow(): void;
  cancel(): void;
}

export class BrowserListener implements SpeechListener {
  readonly engine = "browser";
  private rec: Recognition | null = null;
  private active = false;
  private finalText = "";
  private interimText = "";
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private langIndex = 0;
  private silenceMs: number;

  constructor(private opts: ListenerOptions) {
    this.silenceMs = opts.silenceMs;
  }

  // silenceMs: cuánto silencio esperar en esta respuesta (más largo si la pregunta pide explicar)
  start(silenceMs = this.silenceMs): void {
    const Ctor = getCtor();
    if (!Ctor) return this.opts.onError("Este navegador no reconoce voz. Usa Chrome o escribe la respuesta.");
    this.cancel();
    this.silenceMs = silenceMs;
    this.active = true;
    this.finalText = "";
    this.interimText = "";
    this.open(Ctor);
  }

  // Envía ya lo que se escuchó, sin esperar el silencio
  sendNow(): void {
    if (this.active) this.finish();
  }

  // Deja de escuchar sin enviar nada
  cancel(): void {
    this.active = false;
    this.clearTimer();
    this.rec?.abort();
    this.rec = null;
  }

  private open(Ctor: RecognitionCtor): void {
    const rec = new Ctor();
    rec.lang = LANGS[this.langIndex];
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      this.interimText = interim;
      this.opts.onInterim(`${this.finalText}${interim}`.trim());
      this.armTimer();
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // onend lo reabre
      if (e.error === "language-not-supported" && this.langIndex < LANGS.length - 1) {
        this.langIndex++;
        return;
      }
      this.cancel();
      this.opts.onError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "No hay permiso para usar el micrófono. Actívalo en el navegador o escribe la respuesta."
          : `Error del micrófono (${e.error}). Puedes escribir la respuesta.`,
      );
    };

    // Chrome cierra la sesión sola tras silencios largos: si seguimos escuchando, se reabre
    rec.onend = () => {
      if (this.active && this.rec === rec) this.open(Ctor);
    };

    this.rec = rec;
    rec.start();
  }

  private armTimer(): void {
    this.clearTimer();
    const text = `${this.finalText}${this.interimText}`.trim();
    if (text) this.pauseTimer = setTimeout(() => this.opts.onPause?.(text), PAUSE_MS);
    this.silenceTimer = setTimeout(() => this.finish(), this.silenceMs);
  }

  private clearTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.silenceTimer = null;
    this.pauseTimer = null;
  }

  private finish(): void {
    const text = `${this.finalText}${this.interimText}`.trim();
    this.cancel();
    if (text) this.opts.onFinal(text);
    else this.start(); // nada que enviar: sigue escuchando
  }
}
