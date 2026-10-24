// Formulario que se va llenando en vivo durante la conversación
import type { TurnState } from "@/lib/agent/stage";
import type { FormDraft } from "@/lib/schema/form";
import { FORM_FIELDS, formValue } from "./labels";

export function FormPanel({ state, justFilled }: { state: TurnState | null; justFilled: Set<keyof FormDraft> }) {
  return (
    <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-60">Formulario</h2>
      <dl className="space-y-2">
        {FORM_FIELDS.map(([field, label]) => {
          const value = state ? formValue(field, state.form) : null;
          const unconfirmed = state?.unconfirmed.includes(field as never);
          const skipped = state?.skipped.includes(field as never);
          const fresh = justFilled.has(field);
          return (
            <div
              key={field}
              className={`flex items-baseline justify-between gap-3 rounded-lg px-2 py-1 transition-colors duration-700 ${fresh ? "bg-green-100 dark:bg-green-900/40" : ""}`}
            >
              <dt className="text-sm opacity-60">{label}</dt>
              <dd className="text-right text-sm font-medium">
                {value ?? <span className="opacity-30">{skipped ? "no lo dio" : "—"}</span>}
                {value && unconfirmed && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                    por confirmar
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
