"use client";
// Demo de voz: Manito habla, escucha, llena el formulario en vivo y termina con el perfil
import { useEffect, useRef, useState } from "react";
import { OPENING_LINE, initialState, runTurn, type TurnResult, type TurnState } from "@/lib/agent/stage";
import type { Assessment } from "@/lib/schema/assessment";
import type { FormDraft } from "@/lib/schema/form";
import { ScribeListener } from "@/lib/voice/scribe";
import { clearCache, prefetch, speak, stopSpeaking } from "@/lib/voice/tts";
import { FormPanel } from "./FormPanel";
import { ProfileCard } from "./ProfileCard";

type Status = "idle" | "waiting" | "speaking" | "listening" | "thinking" | "assessing" | "done";

// Silencio que da por terminada una respuesta hablada, según lo que se preguntó:
// un "sí" es corto; explicar el oficio lleva pausas para pensar
const SILENCE_MS: Record<"confirm" | "register" | "trade", number> = {
  confirm: 1300,
  register: 2000,
  trade: 3000,
};

function silenceFor(asking: TurnState["asking"]): number {
  if (asking === "confirm") return SILENCE_MS.confirm;
  if (asking === "q18" || asking === "q19" || asking === "q22") return SILENCE_MS.trade;
  return SILENCE_MS.register;
}
// Si el turno no llega a tiempo, se sigue sin datos (Manito repite la pregunta)
const TURN_TIMEOUT_MS = 9000;

const STATUS_LABEL: Record<Status, string> = {
  idle: "Lista para empezar",
  waiting: "Esperando tu respuesta (escríbela abajo)",
  speaking: "Manito está hablando",
  listening: "Escuchando…",
  thinking: "Pensando…",
  assessing: "Armando el perfil…",
  done: "Listo",
};

type Timing = { turnMs: number; voiceMs: number };

async function postTurn(state: TurnState, userText: string): Promise<TurnResult & { degraded?: boolean }> {
  const r = await fetch("/api/agent/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, userText }),
    signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`turn ${r.status}`);
  return r.json();
}

export default function DemoPage() {
  const [turn, setTurn] = useState<TurnState | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [justFilled, setJustFilled] = useState<Set<keyof FormDraft>>(new Set());
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [engine, setEngine] = useState<"scribe" | "browser">("scribe");

  // Las funciones asíncronas leen siempre el valor actual desde aquí
  const stateRef = useRef<TurnState | null>(null);
  const busyRef = useRef(false);
  const runRef = useRef(0); // cambia al reiniciar, para descartar respuestas viejas
  const voiceOnRef = useRef(voiceOn);
  const micOnRef = useRef(micOn);
  const listenerRef = useRef<ScribeListener | null>(null);
  const handleRef = useRef<(text: string) => void>(() => {});
  const transcriptEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  useEffect(() => {
    prefetch(OPENING_LINE); // que el saludo suene al instante
    listenerRef.current = new ScribeListener({
      silenceMs: SILENCE_MS.register,
      onInterim: setInterim,
      onFinal: (text) => handleRef.current(text),
      onError: (msg) => { setError(msg); setStatus((s) => (s === "listening" ? "waiting" : s)); },
      onEngineChange: setEngine,
    });
    return () => { listenerRef.current?.close(); stopSpeaking(); };
  }, []);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turn?.history.length, interim]);

  function listen() {
    setInterim("");
    if (micOnRef.current) {
      setStatus("listening");
      listenerRef.current?.start(silenceFor(stateRef.current?.asking ?? null));
    } else {
      setStatus("waiting");
    }
  }

  async function say(text: string, run: number, onStart?: () => void) {
    if (run !== runRef.current) return;
    setStatus("speaking");
    await speak(text, { enabled: voiceOnRef.current, onStart });
  }

  async function start() {
    const run = ++runRef.current;
    const s = initialState();
    stateRef.current = s;
    setTurn(s);
    setError(null);
    // La sesión de Scribe se abre mientras suena el saludo
    if (micOnRef.current) listenerRef.current?.prepare();
    await say(OPENING_LINE, run);
    if (run === runRef.current) listen();
  }

  async function assess(s: TurnState, run: number) {
    setStatus("assessing");
    try {
      const r = await fetch("/api/agent/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: s.form, history: s.history, needsHuman: s.needsHuman }),
      });
      if (!r.ok) throw new Error(`assess ${r.status}`);
      const data = await r.json();
      if (run !== runRef.current) return;
      setAssessment(data.assessment);
      setStatus("done");
    } catch {
      if (run !== runRef.current) return;
      setError("No se pudo armar el perfil. Prueba de nuevo con «Terminar».");
      setStatus("idle");
    }
  }

  async function handleUserText(text: string) {
    const s = stateRef.current;
    if (!s || busyRef.current || s.stage === "closing") return;
    busyRef.current = true;
    const run = runRef.current;
    listenerRef.current?.cancel();
    stopSpeaking();
    setInterim("");
    setError(null);
    setStatus("thinking");
    // Se muestra la respuesta de inmediato; el estado real llega con el turno
    setTurn({ ...s, history: [...s.history, { speaker: "persona", text }] });

    const t0 = performance.now();
    let result: TurnResult & { degraded?: boolean };
    try {
      result = await postTurn(s, text);
    } catch {
      // Sin respuesta del servidor: se sigue en el navegador sin datos nuevos
      result = { ...(await runTurn(s, text, async () => null)), degraded: true };
    }
    if (run !== runRef.current) { busyRef.current = false; return; }
    const turnMs = performance.now() - t0;

    stateRef.current = result.state;
    setTurn(result.state);
    if (result.degraded) setError("No se pudo procesar esa respuesta a tiempo; Manito la vuelve a pedir.");
    if (result.evidenceNotes.length) setEvidence((e) => [...new Set([...e, ...result.evidenceNotes])]);
    const filled = new Set(Object.keys(result.formPatch) as (keyof FormDraft)[]);
    setJustFilled(filled);
    if (filled.size) setTimeout(() => setJustFilled(new Set()), 1800);

    await say(result.reply, run, () => {
      setTimings((t) => [...t, { turnMs, voiceMs: performance.now() - t0 }]);
    });
    busyRef.current = false;
    if (run !== runRef.current) return;
    if (result.done) {
      listenerRef.current?.close(); // libera el micrófono
      await assess(result.state, run);
    } else {
      listen();
    }
  }
  // El micrófono llama a la versión más reciente del manejador
  useEffect(() => { handleRef.current = handleUserText; });

  function finish() {
    const s = stateRef.current;
    if (!s) return;
    listenerRef.current?.cancel();
    stopSpeaking();
    busyRef.current = false;
    void assess(s, runRef.current);
  }

  function reset() {
    runRef.current++;
    listenerRef.current?.close();
    stopSpeaking();
    clearCache();
    prefetch(OPENING_LINE);
    busyRef.current = false;
    stateRef.current = null;
    setTurn(null);
    setStatus("idle");
    setInterim("");
    setDraft("");
    setEvidence([]);
    setJustFilled(new Set());
    setAssessment(null);
    setError(null);
    setTimings([]);
  }

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void handleUserText(text);
  }

  const started = turn !== null;
  const canType = started && !assessment && status !== "thinking" && status !== "assessing" && turn.stage !== "closing";
  const last = timings.at(-1);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Manito <span className="font-normal opacity-50">· Impaktemos</span></h1>
          <p className="text-sm opacity-60">
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${status === "listening" ? "animate-pulse bg-red-500" : status === "speaking" ? "bg-green-500" : "bg-black/20 dark:bg-white/30"}`} />
            {STATUS_LABEL[status]}
            {micOn && <span className="ml-2 opacity-60">· reconocimiento: {engine === "scribe" ? "Scribe" : "navegador"}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} /> Voz</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)} /> Micrófono</label>
          {!started ? (
            <button onClick={start} className="rounded-full bg-foreground px-5 py-2 font-medium text-background">Empezar</button>
          ) : (
            <>
              {!assessment && <button onClick={finish} disabled={status === "assessing"} className="rounded-full border border-black/15 px-4 py-2 disabled:opacity-40 dark:border-white/20">Terminar</button>}
              <button onClick={reset} className="rounded-full border border-black/15 px-4 py-2 dark:border-white/20">Reiniciar</button>
            </>
          )}
        </div>
      </header>

      {turn?.needsHuman && !assessment && (
        <p className="rounded-xl border border-red-400 bg-red-100 p-3 text-sm font-semibold text-red-900 dark:bg-red-950 dark:text-red-100">
          ⚠ Mencionó una emergencia o necesidad urgente: se avisará a una persona del equipo.
        </p>
      )}
      {error && <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{error}</p>}

      <div className="grid flex-1 gap-4 md:grid-cols-[1fr_380px]">
        <section className="flex min-h-[60vh] flex-col rounded-2xl border border-black/10 dark:border-white/15">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!started && (
              <p className="opacity-60">Pulsa «Empezar» y responde en voz alta. También puedes escribir abajo.</p>
            )}
            {turn?.history.map((l, i) => (
              <div key={i} className={`flex ${l.speaker === "manito" ? "justify-start" : "justify-end"}`}>
                <p className={`max-w-[85%] rounded-2xl px-4 py-2 ${l.speaker === "manito" ? "bg-black/5 dark:bg-white/10" : "bg-foreground text-background"}`}>
                  {l.text}
                </p>
              </div>
            ))}
            {interim && (
              <div className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl border border-dashed border-black/20 px-4 py-2 opacity-60 dark:border-white/25">{interim}</p>
              </div>
            )}
            <div ref={transcriptEnd} />
          </div>

          <form onSubmit={submitDraft} className="flex gap-2 border-t border-black/10 p-3 dark:border-white/15">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!canType}
              placeholder={started ? "Escribe la respuesta…" : "Pulsa «Empezar» primero"}
              className="flex-1 rounded-full border border-black/15 bg-transparent px-4 py-2 outline-none focus:border-black/40 disabled:opacity-40 dark:border-white/20"
            />
            {status === "listening" && (
              <button type="button" onClick={() => listenerRef.current?.sendNow()} className="rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/20">
                Enviar ya
              </button>
            )}
            <button type="submit" disabled={!canType || !draft.trim()} className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40">
              Enviar
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          {assessment ? <ProfileCard a={assessment} /> : null}
          <FormPanel state={turn} justFilled={justFilled} />
          {evidence.length > 0 && (
            <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-60">Evidencia</h2>
              <div className="flex flex-wrap gap-1.5">
                {evidence.map((e, i) => (
                  <span key={i} className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">{e}</span>
                ))}
              </div>
            </section>
          )}
          {last && (
            <p className="text-xs tabular-nums opacity-50">
              Último turno: respuesta {Math.round(last.turnMs)} ms · voz empieza {Math.round(last.voiceMs)} ms
              {" "}· mediana voz {Math.round([...timings].map((t) => t.voiceMs).sort((a, b) => a - b)[Math.floor(timings.length / 2)])} ms
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
