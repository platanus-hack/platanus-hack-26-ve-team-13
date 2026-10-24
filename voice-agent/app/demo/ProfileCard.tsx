// Perfil final: lo que ve Impaktemos de cada persona (PRD sección 4.5)
import type { Assessment } from "@/lib/schema/assessment";
import { LEVEL, LEVEL_VS_YEARS, PENDING, ROUTE, SCORES, TRUST_STEPS } from "./labels";

export function ProfileCard({ a }: { a: Assessment }) {
  const route = ROUTE[a.route];
  const trustIdx = TRUST_STEPS.findIndex(([t]) => t === a.trust);

  return (
    <section className="space-y-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">Perfil</h2>

      {a.needsHuman && (
        <p className="rounded-xl border border-red-400 bg-red-100 p-3 text-sm font-semibold text-red-900 dark:bg-red-950 dark:text-red-100">
          ⚠ Mencionó una emergencia o necesidad urgente: contactar cuanto antes.
        </p>
      )}

      <div className={`rounded-xl border p-3 ${route.tone}`}>
        <p className="text-lg font-semibold">{route.label}</p>
        <p className="text-sm opacity-80">{route.detail}</p>
      </div>

      <div>
        <p className="mb-1 text-xs opacity-60">Confianza</p>
        <ol className="flex gap-1">
          {TRUST_STEPS.map(([t, label], i) => (
            <li
              key={t}
              className={`flex-1 rounded-md px-1 py-1 text-center text-xs ${i <= trustIdx ? "bg-foreground text-background" : "bg-black/5 opacity-50 dark:bg-white/10"}`}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-sm">
        <span className="opacity-60">Nivel demostrado: </span>
        <span className="font-medium">{LEVEL[a.demonstratedLevel]}</span>
        {LEVEL_VS_YEARS[a.levelVsYears] && <span className="opacity-60">, {LEVEL_VS_YEARS[a.levelVsYears]}</span>}
      </p>

      <div className="space-y-2">
        {SCORES.map(([key, label]) => {
          const s = a.scores[key];
          return (
            <details key={key} className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm">
                <span className="w-40 shrink-0">{label}</span>
                <span className="flex flex-1 gap-1">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={`h-2 flex-1 rounded-full ${n <= s.score ? "bg-foreground" : "bg-black/10 dark:bg-white/15"}`} />
                  ))}
                </span>
                <span className="w-6 text-right tabular-nums">{s.score}</span>
              </summary>
              <div className="mt-1 space-y-1 pl-2 text-xs opacity-80">
                <p>{s.reason}</p>
                {s.quotes.map((q) => <p key={q} className="italic">“{q}”</p>)}
              </div>
            </details>
          );
        })}
      </div>

      {a.toolsNeeded.length > 0 && (
        <p className="text-sm"><span className="opacity-60">Necesita: </span>{a.toolsNeeded.join(", ")}</p>
      )}

      {a.pendingChecks.length > 0 && (
        <div className="text-sm">
          <p className="opacity-60">Pendiente</p>
          <ul className="list-disc pl-5">
            {a.pendingChecks.map((c, i) => <li key={i}>{PENDING[c.kind]}: {c.detail}</li>)}
          </ul>
        </div>
      )}

      <div className="text-sm">
        <p className="opacity-60">Observaciones</p>
        {a.observations.map((o, i) => <p key={i}>{o}</p>)}
      </div>
    </section>
  );
}
