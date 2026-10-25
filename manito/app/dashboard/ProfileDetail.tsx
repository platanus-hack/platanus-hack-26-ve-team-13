// Perfil completo de una persona: lo que registró Manito y qué certificación ofrecerle
import type { Registro } from "@/lib/dashboard/profiles";
import {
  BUSQUEDA, CONFIANZA, DISPONIBILIDAD, ESTADO_CEDULA, ESTADO_VIVIENDA, EXPERIENCIA, HERRAMIENTAS, MODALIDAD,
  NIVEL_CURSO, NIVEL_DEMOSTRADO, NIVEL_ESTUDIO, NIVEL_VS, PUNTAJES, RUTA, VERIFICACION,
  dato, fechaNacimiento, oficio, registradoEn,
} from "./labels";

type Props = { registro: Registro; sent: boolean; onSend: () => void };

export function ProfileDetail({ registro: { persona, perfil, certificaciones }, sent, onSend }: Props) {
  const ev = perfil?.validacion_tecnica_ia.evaluacion_detallada;
  const confianzaIdx = CONFIANZA.findIndex(([c]) => c === ev?.confianza);
  const evaluado = ev && ev.nivel_demostrado !== "no_evaluado";

  return (
    <article className="space-y-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{`${persona.nombres} ${persona.apellidos}`.trim()}</h2>
          <p className="text-sm opacity-60">Registrado {registradoEn(persona.creado_en)}</p>
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={sent}
          className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {sent ? "Enviado a compañía ✓" : "Enviar a compañía privada"}
        </button>
      </header>

      {ev?.necesita_humano && (
        <p className="rounded-xl border border-red-400 bg-red-100 p-3 text-sm font-semibold text-red-900 dark:bg-red-950 dark:text-red-100">
          ⚠ Mencionó una emergencia o necesidad urgente: contactar cuanto antes.
        </p>
      )}

      {ev && (
        <div className={`rounded-xl border p-3 ${RUTA[ev.ruta].tone}`}>
          <p className="font-semibold">{RUTA[ev.ruta].label}</p>
        </div>
      )}

      {certificaciones.length > 0 && (
        <section className="rounded-xl border border-teal-300 bg-teal-50 p-3 text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-50">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-teal-600 text-xs font-bold text-white">i</span>
            <p className="text-xs font-semibold uppercase tracking-wide">Impaktemos</p>
          </div>
          <p className="mb-2 font-semibold">Ofrecer certificaciones:</p>
          <ul className="space-y-2">
            {certificaciones.map((c) => (
              <li key={c.titulo} className="rounded-lg bg-white/70 p-2 dark:bg-black/30">
                <p className="text-sm font-medium">{c.titulo}</p>
                <p className="text-xs opacity-75">
                  Nivel {NIVEL_CURSO[c.nivel]} · {MODALIDAD[c.modalidad]} · Certifica Impaktemos
                </p>
                <p className="text-xs italic opacity-75">{c.motivo}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title="Datos personales">
        <Field label="Cédula" value={dato(persona.estado_cedula, ESTADO_CEDULA)} />
        <Field label="Número de cédula" value={dato(persona.numero_cedula)} />
        <Field label="Fecha de nacimiento" value={fechaNacimiento(persona.fecha_nacimiento)} />
        <Field label="Teléfono / WhatsApp" value={dato(persona.telefono)} />
        <Field label="Vivienda" value={dato(persona.estado_vivienda, ESTADO_VIVIENDA)} />
        <Field label="Refugio" value={persona.pertenece_refugio ? dato(persona.refugio) : null} />
        <Field label="Dirección" value={dato(persona.direccion)} />
        <Field label="Nivel de estudio" value={dato(persona.nivel_estudio, NIVEL_ESTUDIO)} />
        <Field label="Disponibilidad" value={dato(persona.disponibilidad, DISPONIBILIDAD)} />
      </Section>

      {perfil ? (
        <>
          <Section title="Oficio">
            <Field label="Oficio principal" value={oficio(perfil.oficio_principal.nombre)} />
            <Field label="Años en el oficio" value={dato(perfil.oficio_principal.tiempo_experiencia, EXPERIENCIA)} />
            <Field label="Herramientas" value={dato(perfil.oficio_principal.tiene_herramientas, HERRAMIENTAS)} />
            <Field label="Otros oficios" value={perfil.oficios_secundarios.join(", ") || null} />
            <Field label="Busca" value={dato(perfil.busqueda_laboral, BUSQUEDA)} />
            <Field label="Trabajos anteriores" value={perfil.historial_laboral.trabajos_anteriores.join(", ") || null} />
            <Field label="Tuvo negocio propio" value={perfil.negocio_propio.tuvo_negocio ? "Sí" : null} />
          </Section>

          {ev && (
            <Section title="Evaluación de Manito">
              <div className="col-span-full">
                <p className="mb-1 text-xs opacity-60">Confianza</p>
                <ol className="flex gap-1">
                  {CONFIANZA.map(([c, label], i) => (
                    <li
                      key={c}
                      className={`flex-1 rounded-md px-1 py-1 text-center text-xs ${i <= confianzaIdx ? "bg-foreground text-background" : "bg-black/5 opacity-50 dark:bg-white/10"}`}
                    >
                      {label}
                    </li>
                  ))}
                </ol>
              </div>
              <p className="col-span-full text-sm">
                <span className="opacity-60">Nivel demostrado: </span>
                <span className="font-medium">{NIVEL_DEMOSTRADO[ev.nivel_demostrado]}</span>
                {NIVEL_VS[ev.nivel_vs_experiencia] && <span className="opacity-60">, {NIVEL_VS[ev.nivel_vs_experiencia]}</span>}
              </p>
              {evaluado && (
                <div className="col-span-full space-y-2">
                  {PUNTAJES.map(([key, label]) => {
                    const s = ev.puntajes[key];
                    return (
                      <details key={key}>
                        <summary className="flex cursor-pointer items-center gap-2 text-sm">
                          <span className="w-40 shrink-0">{label}</span>
                          <span className="flex flex-1 gap-1">
                            {[1, 2, 3].map((n) => (
                              <span key={n} className={`h-2 flex-1 rounded-full ${n <= s.puntaje ? "bg-foreground" : "bg-black/10 dark:bg-white/15"}`} />
                            ))}
                          </span>
                          <span className="w-6 text-right tabular-nums">{s.puntaje}</span>
                        </summary>
                        <div className="mt-1 space-y-1 pl-2 text-xs opacity-80">
                          <p>{s.razon}</p>
                          {s.citas.map((q) => <p key={q} className="italic">“{q}”</p>)}
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
              <Field label="Necesita" value={ev.herramientas_necesarias.join(", ") || null} wide />
              {ev.verificaciones_pendientes.length > 0 && (
                <div className="col-span-full text-sm">
                  <p className="text-xs opacity-60">Pendiente</p>
                  <ul className="list-disc pl-5">
                    {ev.verificaciones_pendientes.map((v, i) => <li key={i}>{VERIFICACION[v.tipo] ?? v.tipo}: {v.detalle}</li>)}
                  </ul>
                </div>
              )}
              {perfil.referencias.length > 0 && (
                <div className="col-span-full text-sm">
                  <p className="text-xs opacity-60">Referencias</p>
                  <ul className="list-disc pl-5">
                    {perfil.referencias.map((r, i) => (
                      <li key={i}>
                        {r.nombre}
                        {dato(r.telefono) && ` · ${r.telefono}`}
                        {r.verificada ? " · verificada" : " · sin verificar"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ev.observaciones.length > 0 && (
                <div className="col-span-full text-sm">
                  <p className="text-xs opacity-60">Observaciones</p>
                  {ev.observaciones.map((o, i) => <p key={i}>{o}</p>)}
                </div>
              )}
            </Section>
          )}
        </>
      ) : (
        <p className="text-sm opacity-60">Esta persona no tiene perfil en Mongo todavía.</p>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-60">{title}</h3>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-full" : undefined}>
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className={`text-sm ${value ? "" : "opacity-40"}`}>{value ?? "Sin dato"}</dd>
    </div>
  );
}
