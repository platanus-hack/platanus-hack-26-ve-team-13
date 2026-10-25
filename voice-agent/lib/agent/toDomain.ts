// Traduce el formulario y la evaluación del agente al dominio de Oli (Persona en Supabase,
// Perfil en Mongo). Todo valor que se guarda en su base va en español.
// Ruta relativa hasta mover todo a /manito; ahí pasa a ser "@/domain/..." (ver INTEGRATION.md).
import type { BusquedaLaboral } from "../../../manito/domain/enums/Perfil/BusquedaLaboral";
import type { NivelCerteza } from "../../../manito/domain/enums/Perfil/NivelCerteza";
import type { DisponibilidadLaboral } from "../../../manito/domain/enums/Persona/DisponibilidadLaboral";
import type { EstadoCedula } from "../../../manito/domain/enums/Persona/EstadoCedula";
import type { EstadoVivienda } from "../../../manito/domain/enums/Persona/EstadoVivienda";
import type { NivelEstudio } from "../../../manito/domain/enums/Persona/NivelEstudio";
import type { Refugio } from "../../../manito/domain/enums/Persona/Refugio";
import type { IEvaluacionDetallada, IPuntaje } from "../../../manito/domain/interfaces/IEvaluacionDetallada";
import type { IPerfil } from "../../../manito/domain/interfaces/IPerfil";
import type { IPersona } from "../../../manito/domain/interfaces/IPersona";
import type { IReferencia } from "../../../manito/domain/interfaces/IReferencia";
import { findTrade } from "@/lib/agent/trades";
import type { Assessment } from "@/lib/schema/assessment";
import type { Form } from "@/lib/schema/form";

// Valores fijos para los campos obligatorios de Oli que la demo no pregunta.
// Provisorios hasta acordar con Oli si pasan a ser opcionales (ver INTEGRATION.md).
export const SIN_DATO = {
  fecha_nacimiento: new Date("1900-01-01T00:00:00Z"),   // fecha centinela: no la dio
  estado_vivienda: "refugio" as EstadoVivienda,
  nivel_estudio: "primaria" as NivelEstudio,
  disponibilidad_laboral: "solo_local" as DisponibilidadLaboral,
  busqueda_laboral: "empleo" as BusquedaLaboral,
  texto: "sin_dato",
};

const ESTADO_CEDULA: Record<Form["idStatus"], EstadoCedula> = {
  valid: "vigente", expired: "vencida", lost: "perdida", none: "no_tiene",
};

// Oli distingue buen estado / damnificada también en alquilada y familiar; nosotros no
const ESTADO_VIVIENDA: Record<NonNullable<Form["housing"]>, EstadoVivienda> = {
  shelter: "refugio",
  own_good: "casa_propia_buen_estado",
  own_damaged: "casa_propia_damnificada",
  rented: "alquilada_buen_estado",
  relative: "casa_familiar_buen_estado",
};

const NIVEL_ESTUDIO: Record<NonNullable<Form["education"]>, NivelEstudio> = {
  none: "sin_escolaridad", primary: "primaria", secondary: "bachillerato",
  technical: "tecnico_superior", university: "universitario",
};

const DISPONIBILIDAD: Record<NonNullable<Form["mobility"]>, DisponibilidadLaboral> = {
  outside_ok: "completa", only_la_guaira: "solo_local", depends_transport: "depende_transporte",
};

const REFUGIO: Partial<Record<NonNullable<Form["sector"]>, Refugio>> = {
  ciudad_piar: "Ciudad Piar", la_lucha: "La Lucha",
};

const BUSQUEDA: Record<NonNullable<Form["seeking"]>, BusquedaLaboral> = {
  employment: "empleo", own_business: "negocio_propio", freelance: "independiente",
};

const EXPERIENCIA: Record<NonNullable<Form["yearsBand"]>, string> = {
  lt1: "menos_de_1", "1to3": "1_a_3", "3to10": "3_a_10", gt10: "mas_de_10",
};

const HERRAMIENTAS: Record<NonNullable<Form["tools"]>, string> = {
  has: "tiene", lost: "perdidas", never_had: "nunca_tuvo",
};

const CERTEZA: Record<Assessment["trust"], NivelCerteza> = {
  declared: "dudoso", probed: "medio", with_reference: "alto", verified: "alto",
};

const NIVEL: Record<Assessment["demonstratedLevel"], IEvaluacionDetallada["nivel_demostrado"]> = {
  basic: "basico", intermediate: "intermedio", expert: "experto", not_assessed: "no_evaluado",
};

const NIVEL_VS: Record<Assessment["levelVsYears"], IEvaluacionDetallada["nivel_vs_experiencia"]> = {
  matches: "coincide", below: "por_debajo", above: "por_encima", not_assessed: "no_evaluado",
};

const CONFIANZA: Record<Assessment["trust"], IEvaluacionDetallada["confianza"]> = {
  declared: "declarado", probed: "repreguntado", with_reference: "con_referencia", verified: "verificado",
};

const RUTA: Record<Assessment["route"], IEvaluacionDetallada["ruta"]> = {
  human_review: "revision_humana", training: "formacion",
  ready_with_support: "listo_con_apoyo", ready_to_match: "listo_para_emparejar",
};

const VERIFICACION: Record<Assessment["pendingChecks"][number]["kind"], IEvaluacionDetallada["verificaciones_pendientes"][number]["tipo"]> = {
  reference: "referencia", photo: "foto", rif: "rif", tools: "herramientas",
};

// "José Rodríguez" → José / Rodríguez; "José Luis Rodríguez Pérez" → José Luis / Rodríguez Pérez.
// Provisorio: con 3 palabras se asume un nombre y dos apellidos.
export function splitName(name: string): { nombres: string; apellidos: string } {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return { nombres: words[0], apellidos: "" };
  const cut = words.length >= 4 ? 2 : 1;
  return { nombres: words.slice(0, cut).join(" "), apellidos: words.slice(cut).join(" ") };
}

const puntaje = (s: Assessment["scores"]["specificity"]): IPuntaje => ({
  puntaje: s.score, citas: s.quotes, razon: s.reason,
});

export function toPersona(form: Form): IPersona {
  const refugio = form.housing === "shelter" && form.sector ? (REFUGIO[form.sector] ?? null) : null;
  return {
    id: form.intakeId,
    ...splitName(form.name),
    estado_cedula: ESTADO_CEDULA[form.idStatus],
    numero_cedula: form.idNumber ?? null,
    fecha_nacimiento: form.birthDate ? new Date(`${form.birthDate}T00:00:00Z`) : SIN_DATO.fecha_nacimiento,
    telefono: form.phone ?? null,
    pertenece_refugio: form.housing === "shelter",
    refugio,
    direccion: form.sector === "catia_la_mar" ? "Catia La Mar" : null,
    estado_vivienda: form.housing ? ESTADO_VIVIENDA[form.housing] : SIN_DATO.estado_vivienda,
    nivel_estudio: form.education ? NIVEL_ESTUDIO[form.education] : SIN_DATO.nivel_estudio,
    disponibilidad_laboral: form.mobility ? DISPONIBILIDAD[form.mobility] : SIN_DATO.disponibilidad_laboral,
  };
}

export function toPerfil(form: Form, assessment: Assessment, now = new Date()): IPerfil {
  const { scores } = assessment;
  const referencias: IReferencia[] = assessment.pendingChecks
    .filter((c) => c.kind === "reference")
    .map((c) => ({ nombre: c.detail, relacion: SIN_DATO.texto, verificada: false, detalle: c.detail }));

  return {
    persona_id: form.intakeId,
    oficio_principal: {
      // trade es un id del banco ("masonry") o lo que dijo la persona, ya en español
      nombre: form.trade === null ? "sin_oficio" : (findTrade(form.trade)?.label ?? form.trade),
      tiempo_experiencia: form.yearsBand ? EXPERIENCIA[form.yearsBand] : SIN_DATO.texto,
      tiene_herramientas: form.tools ? HERRAMIENTAS[form.tools] : SIN_DATO.texto,
    },
    oficios_secundarios: (form.otherSkills ?? []).map((s) => findTrade(s)?.label ?? s),
    busqueda_laboral: form.seeking ? BUSQUEDA[form.seeking] : SIN_DATO.busqueda_laboral,
    historial_laboral: { trabajos_anteriores: [] },
    negocio_propio: { tuvo_negocio: false },
    referencias,
    validacion_tecnica_ia: {
      resumen_validacion: {
        nivel_certeza_oficio: CERTEZA[assessment.trust],
        puntuacion_global: scores.specificity.score + scores.knowledge.score
          + scores.coherence.score + scores.externalEvidence.score,   // 0-12
        resumen_ia: assessment.observations.join(" "),
      },
      evaluacion_detallada: {
        puntajes: {
          especificidad: puntaje(scores.specificity),
          conocimiento_practico: puntaje(scores.knowledge),
          coherencia: puntaje(scores.coherence),
          evidencia_externa: puntaje(scores.externalEvidence),
        },
        nivel_demostrado: NIVEL[assessment.demonstratedLevel],
        nivel_vs_experiencia: NIVEL_VS[assessment.levelVsYears],
        confianza: CONFIANZA[assessment.trust],
        ruta: RUTA[assessment.route],
        necesita_humano: assessment.needsHuman,
        observaciones: assessment.observations,
        herramientas_necesarias: assessment.toolsNeeded,
        verificaciones_pendientes: assessment.pendingChecks.map((c) => ({ tipo: VERIFICACION[c.kind], detalle: c.detail })),
        modelo: assessment.model,
        evaluado_en: new Date(assessment.assessedAt),
      },
    },
    fechas: { creado_en: now, actualizado_en: now },
  };
}

export function toDomain(form: Form, assessment: Assessment): { persona: IPersona; perfil: IPerfil } {
  return { persona: toPersona(form), perfil: toPerfil(form, assessment) };
}
