import { describe, expect, it } from "vitest";
import { SIN_DATO, splitName, toPerfil, toPersona } from "@/lib/agent/toDomain";
import type { Assessment } from "@/lib/schema/assessment";
import type { Form } from "@/lib/schema/form";

const score = (n: number, quotes: string[]) => ({ score: n, quotes, reason: "r" });

// José, guion de la demo (PRD sección 5)
const jose: Form = {
  intakeId: "7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b",
  name: "José Rodríguez",
  idStatus: "valid",
  idNumber: "V-15234876",
  birthDate: "1980-03-03",
  phone: "04125551234",
  trade: "masonry",
  yearsBand: "gt10",
  tools: "lost",
};

const assessment: Assessment = {
  scores: {
    specificity: score(2, ["la señora Carmen, en Catia La Mar"]),
    knowledge: score(3, ["pongo las maestras con el nivel"]),
    coherence: score(3, ["Mojo la pared"]),
    externalEvidence: score(2, ["Le frisé la casa el año pasado"]),
  },
  demonstratedLevel: "expert",
  observations: ["Explica el friso con detalle.", "Dice más de 10 años y el nivel lo confirma."],
  toolsNeeded: ["cuchara", "llana"],
  pendingChecks: [{ kind: "reference", detail: "señora Carmen, Catia La Mar" }],
  levelVsYears: "matches",
  trust: "with_reference",
  route: "ready_with_support",
  needsHuman: false,
  model: "claude-sonnet-5-5",
  assessedAt: "2026-10-24T15:00:00.000Z",
};

describe("splitName", () => {
  it("uses Claude's lastNames when they match the end of the name", () => {
    expect(splitName("María José Pérez", "Pérez")).toEqual({ nombres: "María José", apellidos: "Pérez" });
    expect(splitName("José Luis Rodríguez Pérez", "Rodríguez Pérez")).toEqual({ nombres: "José Luis", apellidos: "Rodríguez Pérez" });
  });

  it("falls back to word count when lastNames don't match or are the whole name", () => {
    expect(splitName("María José Pérez", "Gómez")).toEqual({ nombres: "María", apellidos: "José Pérez" });
    expect(splitName("Pérez", "Pérez")).toEqual({ nombres: "Pérez", apellidos: "" });
  });

  it("splits by word count", () => {
    expect(splitName("José Rodríguez")).toEqual({ nombres: "José", apellidos: "Rodríguez" });
    expect(splitName("José Rodríguez Pérez")).toEqual({ nombres: "José", apellidos: "Rodríguez Pérez" });
    expect(splitName("José Luis Rodríguez Pérez")).toEqual({ nombres: "José Luis", apellidos: "Rodríguez Pérez" });
    expect(splitName("José")).toEqual({ nombres: "José", apellidos: "" });
  });
});

describe("toPersona", () => {
  it("maps José's form to Spanish values", () => {
    const p = toPersona(jose);
    expect(p).toMatchObject({
      id: jose.intakeId,
      nombres: "José",
      apellidos: "Rodríguez",
      estado_cedula: "vigente",
      numero_cedula: "V-15234876",
      telefono: "04125551234",
      pertenece_refugio: false,
      refugio: null,
    });
    expect(p.fecha_nacimiento.toISOString()).toBe("1980-03-03T00:00:00.000Z");
  });

  it("fills required fields the demo doesn't ask with fixed values", () => {
    const p = toPersona({ ...jose, birthDate: undefined });
    expect(p.fecha_nacimiento).toEqual(SIN_DATO.fecha_nacimiento);
    expect(p.estado_vivienda).toBe(SIN_DATO.estado_vivienda);
    expect(p.nivel_estudio).toBe(SIN_DATO.nivel_estudio);
    expect(p.disponibilidad_laboral).toBe(SIN_DATO.disponibilidad_laboral);
  });

  it("maps shelter and sector to refugio", () => {
    const p = toPersona({ ...jose, housing: "shelter", sector: "la_lucha", mobility: "depends_transport" });
    expect(p).toMatchObject({ pertenece_refugio: true, refugio: "La Lucha", estado_vivienda: "refugio", disponibilidad_laboral: "depende_transporte" });
  });
});

describe("toPerfil", () => {
  const perfil = toPerfil(jose, assessment, new Date("2026-10-24T15:00:00Z"));

  it("maps the trade with Spanish values", () => {
    expect(perfil.persona_id).toBe(jose.intakeId);
    expect(perfil.oficio_principal).toEqual({ nombre: "albañil", tiempo_experiencia: "mas_de_10", tiene_herramientas: "perdidas" });
    expect(perfil.busqueda_laboral).toBe(SIN_DATO.busqueda_laboral);
  });

  it("summarizes the assessment in resumen_validacion", () => {
    expect(perfil.validacion_tecnica_ia.resumen_validacion).toEqual({
      nivel_certeza_oficio: "alto",
      puntuacion_global: 10,
      resumen_ia: "Explica el friso con detalle. Dice más de 10 años y el nivel lo confirma.",
    });
  });

  it("keeps the full assessment in Spanish in evaluacion_detallada", () => {
    expect(perfil.validacion_tecnica_ia.evaluacion_detallada).toMatchObject({
      puntajes: { conocimiento_practico: { puntaje: 3, citas: ["pongo las maestras con el nivel"] } },
      nivel_demostrado: "experto",
      nivel_vs_experiencia: "coincide",
      confianza: "con_referencia",
      ruta: "listo_con_apoyo",
      necesita_humano: false,
      verificaciones_pendientes: [{ tipo: "referencia", detalle: "señora Carmen, Catia La Mar" }],
    });
  });

  it("turns reference checks into unverified referencias without phone", () => {
    expect(perfil.referencias).toEqual([
      { nombre: "señora Carmen, Catia La Mar", relacion: "sin_dato", verificada: false, detalle: "señora Carmen, Catia La Mar" },
    ]);
  });

  it("maps no trade and freelance", () => {
    const p = toPerfil({ ...jose, trade: null, yearsBand: undefined, seeking: "freelance" }, { ...assessment, trust: "declared" });
    expect(p.oficio_principal.nombre).toBe("sin_oficio");
    expect(p.oficio_principal.tiempo_experiencia).toBe("sin_dato");
    expect(p.busqueda_laboral).toBe("independiente");
    expect(p.validacion_tecnica_ia.resumen_validacion?.nivel_certeza_oficio).toBe("dudoso");
  });
});
