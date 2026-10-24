// Frases fijas que dice Manito (PRD secciones 5 y 16). Editar aquí la redacción final.

// Siempre se aclara primero que no hay una persona atendiendo
export const GREETING =
  "Hola, soy Manito, de Impaktemos. En este momento no hay una persona disponible para atenderte, así que por ahora te atiendo yo. Te voy a hacer unas preguntas cortas para registrarte.";

// Preguntas del registro, por grupo. "all" cuando falta todo el grupo.
export const REGISTER_QUESTIONS = {
  nameBirth: {
    all: "¿Cómo te llamas y cuándo naciste?",
    name: "¿Cómo te llamas?",
    birthDate: "¿Y cuándo naciste? Dime el día, el mes y el año.",
  },
  id: {
    all: "¿Tienes cédula? Si la tienes, dime el número.",
    idNumber: "¿Me repites el número de cédula?",
  },
  phone: {
    all: "¿A qué número te escribimos por WhatsApp?",
  },
  trade: {
    all: "¿A qué te dedicabas antes del terremoto, y desde hace cuánto?",
    trade: "¿Y a qué te dedicabas antes del terremoto?",
    yearsBand: "¿Y desde hace cuánto te dedicas a eso?",
  },
} as const;

// Se antepone cuando una respuesta no se entendió y se repite la pregunta
export const RETRY_PREFIX = "Disculpa, no te entendí bien.";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "1980-03-03" → "3 de marzo de 1980"
const spokenDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`;
};
// "V-15234876" → "V-15.234.876"
const spokenId = (id: string) => id.replace(/\B(?=(\d{3})+$)/g, ".");
// "04125551234" → "0412-555-1234"
const spokenPhone = (p: string) => `${p.slice(0, 4)}-${p.slice(4, 7)}-${p.slice(7)}`;

// Lee de vuelta los datos para que la persona los confirme
export function confirmLine(data: { name?: string; birthDate?: string; idNumber?: string; phone?: string }): string {
  const parts = [
    data.name,
    data.birthDate && `fecha de nacimiento ${spokenDate(data.birthDate)}`,
    data.idNumber && `cédula ${spokenId(data.idNumber)}`,
    data.phone && `teléfono ${spokenPhone(data.phone)}`,
  ].filter(Boolean);
  return `Para confirmar: ${parts.join(", ")}. ¿Está bien?`;
}

export function closingLine(name?: string): string {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName
    ? `¡Listo, ${firstName}! Estoy armando tu perfil y te escribimos con los próximos pasos.`
    : "¡Listo! Estoy armando tu perfil y te escribimos con los próximos pasos.";
}
