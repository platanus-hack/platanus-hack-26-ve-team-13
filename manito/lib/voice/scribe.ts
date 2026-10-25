// Micrófono → texto con ElevenLabs Scribe v2 Realtime. Si Scribe falla, pasa al
// reconocimiento del navegador sin cortar la conversación.
import { CommitStrategy, RealtimeEvents, Scribe, type RealtimeConnection } from "@elevenlabs/client";
import { KEYTERMS } from "@/lib/voice/keyterms";
import { BrowserListener, PAUSE_MS, type ListenerOptions, type SpeechListener } from "@/lib/voice/stt";

// La respuesta se transcribe entera, en un solo segmento, cuando termina (silenceMs):
// cortarla en cada pausa partía los números ("ochocientos setenta y seis" → "800-76")
// Al terminar, cuánto esperar el texto final
const LAST_SEGMENT_WAIT_MS = 1500;

async function fetchToken(): Promise<string> {
  const r = await fetch("/api/voice/scribe-token", { method: "POST" });
  if (!r.ok) throw new Error(`scribe token ${r.status}`);
  return ((await r.json()) as { token: string }).token;
}

export class ScribeListener implements SpeechListener {
  private conn: RealtimeConnection | null = null;
  private connecting: Promise<RealtimeConnection> | null = null;
  private active = false;
  private committed = "";
  private partial = "";
  private silenceMs: number;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private onCommitted: (() => void) | null = null;
  private fallback: BrowserListener | null = null;

  constructor(private opts: ListenerOptions) {
    this.silenceMs = opts.silenceMs;
  }

  get engine() {
    return this.fallback ? "browser" : "scribe";
  }

  // Abre la sesión antes de que haga falta (por ejemplo, mientras suena el saludo)
  prepare(): void {
    if (!this.fallback) this.connection().catch(() => {});
  }

  start(silenceMs = this.silenceMs): void {
    if (this.fallback) return this.fallback.start(silenceMs);
    this.clearTimer();
    this.silenceMs = silenceMs;
    this.committed = "";
    this.partial = "";
    this.active = true;
    this.connection()
      .then((conn) => { if (this.active) conn.unmute(); })
      .catch((error) => this.switchToBrowser(error, silenceMs));
  }

  sendNow(): void {
    if (this.fallback) return this.fallback.sendNow();
    if (this.active) void this.finish();
  }

  cancel(): void {
    this.fallback?.cancel();
    this.active = false;
    this.clearTimer();
    this.conn?.mute();
  }

  // Cierra la sesión (al reiniciar o salir de la página)
  close(): void {
    this.cancel();
    this.conn?.close();
    this.conn = null;
  }

  private connection(): Promise<RealtimeConnection> {
    if (this.conn) return Promise.resolve(this.conn);
    this.connecting ??= (async () => {
      const conn = Scribe.connect({
        token: await fetchToken(),
        modelId: "scribe_v2_realtime",
        languageCode: "es",
        commitStrategy: CommitStrategy.MANUAL,
        keyterms: KEYTERMS,
        microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      conn.mute(); // solo se escucha cuando Manito termina de hablar
      this.listenTo(conn);
      this.conn = conn;
      return conn;
    })().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  private listenTo(conn: RealtimeConnection): void {
    conn.on(RealtimeEvents.PARTIAL_TRANSCRIPT, ({ text }) => {
      if (!this.active) return;
      this.partial = text;
      this.update();
    });
    conn.on(RealtimeEvents.COMMITTED_TRANSCRIPT, ({ text }) => {
      if (this.active && text.trim()) this.committed += `${text.trim()} `;
      this.partial = "";
      this.onCommitted?.();
      if (this.active) this.update();
    });
    conn.on(RealtimeEvents.CLOSE, () => {
      if (this.conn === conn) this.conn = null; // el próximo start() abre otra sesión
    });
    for (const e of [
      RealtimeEvents.AUTH_ERROR, RealtimeEvents.ERROR, RealtimeEvents.QUOTA_EXCEEDED,
      RealtimeEvents.UNACCEPTED_TERMS, RealtimeEvents.RATE_LIMITED, RealtimeEvents.RESOURCE_EXHAUSTED,
    ] as const) {
      conn.on(e, (msg: unknown) => this.switchToBrowser(msg, this.silenceMs));
    }
  }

  private update(): void {
    const text = `${this.committed}${this.partial}`.trim();
    this.opts.onInterim(text);
    this.clearTimer();
    if (text) this.pauseTimer = setTimeout(() => this.opts.onPause?.(text), PAUSE_MS);
    this.silenceTimer = setTimeout(() => void this.finish(), this.silenceMs);
  }

  private async finish(): Promise<void> {
    this.clearTimer();
    // Pide cerrar el segmento en curso y espera un momento su texto final
    if (this.partial && this.conn) {
      const committed = new Promise<void>((resolve) => { this.onCommitted = resolve; });
      this.conn.commit();
      await Promise.race([committed, new Promise((r) => setTimeout(r, LAST_SEGMENT_WAIT_MS))]);
      this.onCommitted = null;
    }
    if (!this.active) return;
    const text = `${this.committed}${this.partial}`.trim();
    this.cancel();
    if (text) this.opts.onFinal(text);
    else this.start(this.silenceMs);
  }

  private clearTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.silenceTimer = null;
    this.pauseTimer = null;
  }

  private switchToBrowser(error: unknown, silenceMs: number): void {
    if (this.fallback) return;
    console.warn("[scribe] usando el reconocimiento del navegador:", error);
    const wasActive = this.active;
    this.close();
    this.fallback = new BrowserListener(this.opts);
    this.opts.onEngineChange?.("browser");
    if (wasActive) this.fallback.start(silenceMs);
  }
}
