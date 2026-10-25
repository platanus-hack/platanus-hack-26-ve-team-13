"use client";
// Lista de registros, del más nuevo al más viejo. Al elegir uno se abre su perfil al lado.
import { useState } from "react";
import type { Registro } from "@/lib/dashboard/profiles";
import { EXPERIENCIA, RUTA, dato, oficio, registradoEn } from "./labels";
import { ProfileDetail } from "./ProfileDetail";

export function ProfileList({ registros }: { registros: Registro[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(registros[0]?.persona.id ?? null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  // Los que llegan después de abrir el panel se marcan como nuevos
  const [seen] = useState(() => new Set(registros.map((r) => r.persona.id)));
  const isNew = (id: string) => !seen.has(id);

  const selected = registros.find((r) => r.persona.id === selectedId) ?? null;

  const send = (id: string) => setSent((s) => new Set(s).add(id));

  if (registros.length === 0) return <p className="text-sm opacity-60">Todavía no hay registros.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="space-y-2">
        <p className="text-xs opacity-60">{registros.length} personas registradas</p>
        <ul className="space-y-2">
          {registros.map(({ persona, perfil }) => {
            const ruta = perfil?.validacion_tecnica_ia.evaluacion_detallada?.ruta;
            const urgente = perfil?.validacion_tecnica_ia.evaluacion_detallada?.necesita_humano;
            const experiencia = perfil && dato(perfil.oficio_principal.tiempo_experiencia, EXPERIENCIA);
            const active = persona.id === selectedId;
            const wasSent = sent.has(persona.id);
            return (
              <li key={persona.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setSelectedId(persona.id)}
                  className={`w-full rounded-2xl border p-3 pr-4 text-left transition ${
                    active
                      ? "border-foreground/40 bg-black/5 dark:bg-white/10"
                      : "border-black/10 hover:bg-black/3 dark:border-white/15 dark:hover:bg-white/5"
                  } ${isNew(persona.id) ? "ring-2 ring-green-400" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {urgente && <span className="mr-1 text-red-600" title="Necesidad urgente">⚠</span>}
                      {`${persona.nombres} ${persona.apellidos}`.trim()}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums opacity-60">{registradoEn(persona.creado_en)}</span>
                  </div>
                  <p className="text-sm opacity-70">
                    {perfil ? oficio(perfil.oficio_principal.nombre) : "Sin perfil en Mongo"}
                    {experiencia && ` · ${experiencia}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    {isNew(persona.id) && (
                      <span className="rounded-full bg-green-500 px-2 py-0.5 font-medium text-white">Nuevo</span>
                    )}
                    {ruta && <span className={`rounded-full border px-2 py-0.5 ${RUTA[ruta].tone}`}>{RUTA[ruta].label}</span>}
                    {wasSent && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-background">Enviado a compañía</span>
                    )}
                  </div>
                </button>
                {!wasSent && (
                  // Siempre visible en pantallas táctiles; con mouse aparece al pasar por encima
                  <button
                    type="button"
                    onClick={() => send(persona.id)}
                    className="absolute bottom-3 right-3 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow transition md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                  >
                    Enviar a compañía privada
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="lg:sticky lg:top-4 lg:self-start">
        {selected
          ? <ProfileDetail registro={selected} sent={sent.has(selected.persona.id)} onSend={() => send(selected.persona.id)} />
          : <p className="text-sm opacity-60">Elige una persona para ver su perfil.</p>}
      </div>
    </div>
  );
}
