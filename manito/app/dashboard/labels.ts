// Textos en español para los valores que guarda la base (Persona y Perfil)
import type { RutaAtencion } from "@/domain/enums/Perfil/RutaAtencion";
import type { IEvaluacionDetallada } from "@/domain/interfaces/IEvaluacionDetallada";
import { SIN_DATO } from "@/lib/agent/toDomain";

export const ESTADO_CEDULA: Record<string, string> = {
  vigente: "Vigente", vencida: "Vencida", perdida: "La perdió", no_tiene: "No tiene",
};

export const ESTADO_VIVIENDA: Record<string, string> = {
  refugio: "Refugio",
  casa_propia_buen_estado: "Casa propia, buen estado",
  casa_propia_damnificada: "Casa propia, damnificada",
  alquilada_buen_estado: "Alquilada, buen estado",
  alquilada_damnificada: "Alquilada, damnificada",
  casa_familiar_buen_estado: "Casa de familiar, buen estado",
  casa_familiar_damnificada: "Casa de familiar, damnificada",
  sin_hogar: "Sin hogar",
};

export const NIVEL_ESTUDIO: Record<string, string> = {
  sin_escolaridad: "Sin escolaridad", primaria: "Primaria", bachillerato: "Bachillerato",
  tecnico_superior: "Técnico superior", universitario: "Universitario",
};

export const DISPONIBILIDAD: Record<string, string> = {
  completa: "Puede trabajar fuera de La Guaira", solo_local: "Solo en La Guaira", depende_transporte: "Depende del transporte",
};

export const EXPERIENCIA: Record<string, string> = {
  menos_de_1: "Menos de 1 año", "1_a_3": "1 a 3 años", "3_a_10": "3 a 10 años", mas_de_10: "Más de 10 años",
};

export const HERRAMIENTAS: Record<string, string> = {
  tiene: "Las tiene", perdidas: "Las perdió", nunca_tuvo: "Nunca tuvo",
};

export const BUSQUEDA: Record<string, string> = {
  empleo: "Empleo", negocio_propio: "Negocio propio", independiente: "Independiente",
};

export const NIVEL_DEMOSTRADO: Record<string, string> = {
  basico: "Básico", intermedio: "Intermedio", experto: "Experto", no_evaluado: "No evaluado",
};

export const NIVEL_VS: Record<string, string> = {
  coincide: "coincide con los años declarados",
  por_debajo: "por debajo de los años declarados",
  por_encima: "por encima de los años declarados",
  no_evaluado: "",
};

export const CONFIANZA: [IEvaluacionDetallada["confianza"], string][] = [
  ["declarado", "Declarado"],
  ["repreguntado", "Repreguntado"],
  ["con_referencia", "Con referencia"],
  ["verificado", "Verificado"],
];

export const PUNTAJES: [keyof IEvaluacionDetallada["puntajes"], string][] = [
  ["especificidad", "Especificidad"],
  ["conocimiento_practico", "Conocimiento práctico"],
  ["coherencia", "Coherencia"],
  ["evidencia_externa", "Evidencia externa"],
];

export const VERIFICACION: Record<string, string> = {
  referencia: "Llamar referencia", foto: "Revisar fotos", rif: "Verificar RIF",
  herramientas: "Preguntar por herramientas", registro: "Completar registro",
};

export const NIVEL_CURSO: Record<string, string> = {
  principiante: "Principiante", basico: "Básico", medio: "Medio", avanzado: "Avanzado",
};

export const MODALIDAD: Record<string, string> = { online: "Online", presencial: "Presencial", mixto: "Mixto" };

export const RUTA: Record<RutaAtencion, { label: string; tone: string }> = {
  revision_humana: {
    label: "Revisión humana",
    tone: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  },
  formacion: {
    label: "Formación",
    tone: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  },
  listo_con_apoyo: {
    label: "Listo con apoyo",
    tone: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  listo_para_emparejar: {
    label: "Listo para matching",
    tone: "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Los valores centinela de toDomain significan "no lo dijo"
export function dato(v: string | null | undefined, labels?: Record<string, string>): string | null {
  if (v == null || v === "" || v === SIN_DATO.texto || v === SIN_DATO.numero_cedula) return null;
  return labels?.[v] ?? v;
}

export function oficio(nombre: string): string {
  if (!nombre.trim()) return "Oficio sin dato";
  return nombre === "sin_oficio" ? "Sin oficio · quiere aprender" : capitalize(nombre);
}

export function fechaNacimiento(iso: string): string | null {
  if (iso.startsWith("1900-01-01")) return null;
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// A mano y no con Intl: Node y el navegador separan "a. m." con espacios distintos y
// eso rompe la hidratación. Venezuela está en UTC-4 todo el año.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const CARACAS_MS = -4 * 60 * 60 * 1000;
const dos = (n: number) => String(n).padStart(2, "0");
export function registradoEn(iso: string): string {
  const d = new Date(new Date(iso).getTime() + CARACAS_MS);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}, ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}
