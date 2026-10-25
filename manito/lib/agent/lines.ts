// Frases fijas que dice Manito (PRD secciones 5 y 16). Editar aquí la redacción final.

// Siempre se aclara primero que no hay una persona atendiendo
export const GREETING =
  "Hola, soy Manito, de Impaktemos. Ahorita no hay una persona disponible, así que te atiendo yo con unas preguntas cortas para registrarte.";

// Preguntas del registro, por grupo. "all" cuando falta todo el grupo.
export const REGISTER_QUESTIONS = {
  name: {
    all: "¿Cómo te llamas?",
  },
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

// Antes de la primera pregunta sobre el oficio (P18): avisa el cambio de tema
export const EXPERIENCE_INTRO = "Ahora te voy a hacer unas preguntas sobre tu experiencia de trabajo para entender mejor tu perfil y ver que es lo mejor que te podemos conseguir.";

// Después de "¿Alguien puede dar fe de tu trabajo?" en la demo corta
export const VOUCH_LATER = "Si es así, dime su nombre y nosotros la contactamos más adelante.";

// Se antepone cuando una respuesta no se entendió y se repite la pregunta
export const RETRY_PREFIX = "Disculpa, no te entendí bien.";

// Cuando la persona pregunta algo o se sale del tema. Manito no improvisa respuestas.
export const OFF_SCRIPT_REPLY = "Buena pregunta. Eso te lo responde una persona del equipo cuando te contactemos.";

// Cuando menciona peligro o una necesidad urgente. Se marca para que una persona la contacte.
// BORRADOR: Impaktemos debe aprobar el texto y confirmar el número de emergencias.
export const DISTRESS_REPLY =
  "Lo siento mucho. Si tú o alguien está herido o en peligro, llama ya al 911. Voy a avisarle a una persona del equipo para que te contacte.";

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
