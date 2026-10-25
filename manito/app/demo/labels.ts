// Textos en español para mostrar el formulario y la evaluación
import type { Flow } from "@/lib/agent/stage";
import { findTrade } from "@/lib/agent/trades";
import type { Assessment } from "@/lib/schema/assessment";
import type { FormDraft } from "@/lib/schema/form";

export const FORM_FIELDS = [
  ["name", "Nombre"],
  ["birthDate", "Fecha de nacimiento"],
  ["idStatus", "Cédula"],
  ["idNumber", "Número de cédula"],
  ["phone", "Teléfono / WhatsApp"],
  ["trade", "Oficio"],
  ["yearsBand", "Años en el oficio"],
  ["tools", "Herramientas"],
] as const satisfies readonly (readonly [keyof FormDraft, string])[];

// Campos que se preguntan en la demo corta
const SHORT_FIELDS = new Set<keyof FormDraft>(["name", "trade", "yearsBand", "tools"]);

export function formFields(flow: Flow) {
  return flow === "short" ? FORM_FIELDS.filter(([f]) => SHORT_FIELDS.has(f)) : FORM_FIELDS;
}

const ID_STATUS = { valid: "Vigente", expired: "Vencida", lost: "La perdió", none: "No tiene" };
const YEARS = { lt1: "Menos de 1 año", "1to3": "1 a 3 años", "3to10": "3 a 10 años", gt10: "Más de 10 años" };
const TOOLS = { has: "Las tiene", lost: "Las perdió", never_had: "Nunca tuvo" };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formValue(field: keyof FormDraft, form: FormDraft): string | null {
  const v = form[field];
  if (v === undefined) return null;
  switch (field) {
    case "birthDate": {
      const [y, m, d] = (v as string).split("-");
      return `${d}/${m}/${y}`;
    }
    case "idStatus":
      return ID_STATUS[v as keyof typeof ID_STATUS];
    case "yearsBand":
      return YEARS[v as keyof typeof YEARS];
    case "tools":
      return TOOLS[v as keyof typeof TOOLS];
    case "trade":
      return v === null ? "Sin oficio · quiere aprender" : capitalize(findTrade(v as string)?.label ?? (v as string));
    default:
      return String(v);
  }
}

export const TRUST_STEPS: [Assessment["trust"], string][] = [
  ["declared", "Declarado"],
  ["probed", "Repreguntado"],
  ["with_reference", "Con referencia"],
  ["verified", "Verificado"],
];

export const LEVEL = { basic: "Básico", intermediate: "Intermedio", expert: "Experto", not_assessed: "No evaluado" };

export const LEVEL_VS_YEARS = {
  matches: "coincide con los años declarados",
  below: "por debajo de los años declarados",
  above: "por encima de los años declarados",
  not_assessed: "",
};

export const ROUTE: Record<Assessment["route"], { label: string; detail: string; tone: string }> = {
  human_review: {
    label: "🔴 Revisión humana",
    detail: "Las respuestas no cuadraron en esta conversación. Una persona hace seguimiento; no es un rechazo.",
    tone: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  },
  training: {
    label: "🔵 Formación",
    detail: "Ofrecer formación en un oficio.",
    tone: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  },
  ready_with_support: {
    label: "🟡 Listo con apoyo",
    detail: "Primero herramientas (Fondo Resurge) o documentos; luego, matching.",
    tone: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  ready_to_match: {
    label: "🟢 Listo para matching",
    detail: "Enviar a búsqueda de empleo.",
    tone: "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  },
};

export const SCORES: [keyof NonNullable<Assessment["scores"]>, string][] = [
  ["specificity", "Especificidad"],
  ["knowledge", "Conocimiento práctico"],
  ["coherence", "Coherencia"],
  ["externalEvidence", "Evidencia externa"],
];

export const PENDING = {
  reference: "Llamar referencia", photo: "Revisar fotos", rif: "Verificar RIF",
  tools: "Preguntar por herramientas", registration: "Completar registro",
};
