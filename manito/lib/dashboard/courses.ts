// Certificaciones de Impaktemos que se le pueden ofrecer a cada persona según su oficio,
// su experiencia y lo que trabajó antes. Catálogo borrador: lo debe revisar Impaktemos.
import type { ModalidadCurso } from "@/domain/enums/Curso/ModalidadCurso";
import type { NivelCurso } from "@/domain/enums/Curso/NivelCurso";
import type { IPerfil } from "@/domain/interfaces/IPerfil";
import { findTrade } from "@/lib/agent/trades";

export type Certificacion = {
  titulo: string;
  nivel: NivelCurso;
  modalidad: ModalidadCurso;
  motivo: string;
};

type Entrada = { titulo: string; modalidad: ModalidadCurso; oficio: string };

// Clave: id del banco de oficios (trades.ts) o un id propio para oficios que aún no están ahí
const CATALOGO: Record<string, Entrada> = {
  masonry: { titulo: "Albañilería y frisos", modalidad: "presencial", oficio: "albañil" },
  reception: { titulo: "Atención al cliente y recepción", modalidad: "mixto", oficio: "recepcionista" },
  programming: { titulo: "Desarrollo web", modalidad: "online", oficio: "programador" },
  electrical: { titulo: "Instalaciones eléctricas residenciales", modalidad: "presencial", oficio: "electricista" },
  sewing: { titulo: "Corte y confección", modalidad: "presencial", oficio: "costurera" },
  carpentry: { titulo: "Carpintería y ebanistería", modalidad: "presencial", oficio: "carpintero" },
  plumbing: { titulo: "Plomería residencial", modalidad: "presencial", oficio: "plomero" },
  painting: { titulo: "Pintura de obra y acabados", modalidad: "presencial", oficio: "pintor" },
  cooking: { titulo: "Cocina y manipulación de alimentos", modalidad: "presencial", oficio: "cocinero" },
  welding: { titulo: "Soldadura y herrería", modalidad: "presencial", oficio: "soldador" },
  mechanics: { titulo: "Mecánica automotriz", modalidad: "presencial", oficio: "mecánico" },
};

// Oficios fuera del banco: se reconocen por la raíz de la palabra
const RAICES: [RegExp, string][] = [
  [/plom/, "plumbing"],
  [/pint/, "painting"],
  [/cocin|chef|panader|reposter/, "cooking"],
  [/sold|herre/, "welding"],
  [/mecanic/, "mechanics"],
];

const EMPRENDIMIENTO: Entrada = { titulo: "Emprendimiento y finanzas para tu oficio", modalidad: "mixto", oficio: "" };

// Para quien no tiene oficio: oficios con demanda en la reconstrucción
const FORMACION_INICIAL = ["masonry", "cooking"];

const MAX_SUGERENCIAS = 4;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function oficioId(nombre: string): string | null {
  const trade = findTrade(nombre);
  if (trade) return trade.id;
  const n = normalize(nombre);
  return RAICES.find(([re]) => re.test(n))?.[1] ?? null;
}

const POR_NIVEL: Record<string, NivelCurso> = { basico: "basico", intermedio: "medio", experto: "avanzado" };
const POR_EXPERIENCIA: Record<string, NivelCurso> = {
  menos_de_1: "principiante", "1_a_3": "basico", "3_a_10": "medio", mas_de_10: "avanzado",
};
const EXPERIENCIA_TEXTO: Record<string, string> = {
  menos_de_1: "menos de 1 año", "1_a_3": "1 a 3 años", "3_a_10": "3 a 10 años", mas_de_10: "más de 10 años",
};

type PerfilParaCursos = Pick<IPerfil, "oficio_principal" | "oficios_secundarios" | "busqueda_laboral" | "historial_laboral" | "negocio_propio" | "validacion_tecnica_ia">;

// El nivel que mostró en la conversación pesa más que los años que declaró
function nivelDe(perfil: PerfilParaCursos): NivelCurso {
  const demostrado = perfil.validacion_tecnica_ia.evaluacion_detallada?.nivel_demostrado;
  if (demostrado && POR_NIVEL[demostrado]) return POR_NIVEL[demostrado];
  return POR_EXPERIENCIA[perfil.oficio_principal.tiempo_experiencia] ?? "basico";
}

export function sugerirCertificaciones(perfil: PerfilParaCursos): Certificacion[] {
  const out: Certificacion[] = [];
  const vistos = new Set<string>();
  const agregar = (id: string, nivel: NivelCurso, motivo: string) => {
    if (vistos.has(id) || !CATALOGO[id]) return;
    vistos.add(id);
    const { titulo, modalidad } = CATALOGO[id];
    out.push({ titulo, nivel, modalidad, motivo });
  };

  // Registros hechos a mano pueden traer el oficio vacío: no se adivina
  const principal = perfil.oficio_principal.nombre.trim();
  if (!principal) {
    // sigue con oficios secundarios y trabajos anteriores
  } else if (principal === "sin_oficio") {
    for (const id of FORMACION_INICIAL) agregar(id, "principiante", "No tiene oficio y quiere aprender uno");
  } else {
    const id = oficioId(principal);
    const años = EXPERIENCIA_TEXTO[perfil.oficio_principal.tiempo_experiencia];
    const demostrado = perfil.validacion_tecnica_ia.evaluacion_detallada?.nivel_demostrado;
    const motivo = demostrado && POR_NIVEL[demostrado]
      ? `Demostró nivel ${demostrado} como ${principal}`
      : años ? `Declaró ${años} como ${principal}` : `Su oficio es ${principal}`;
    if (id) agregar(id, nivelDe(perfil), motivo);
    else out.push({ titulo: `Certificación en ${principal}`, nivel: nivelDe(perfil), modalidad: "presencial", motivo });
  }

  for (const s of perfil.oficios_secundarios) {
    const id = oficioId(s);
    if (id) agregar(id, "basico", `También sabe de ${s}`);
  }
  for (const t of perfil.historial_laboral.trabajos_anteriores) {
    const id = oficioId(t);
    if (id) agregar(id, "basico", `Trabajó antes como ${t}`);
  }

  const emprende = perfil.busqueda_laboral !== "empleo" || perfil.negocio_propio.tuvo_negocio;
  if (emprende) {
    out.push({
      ...EMPRENDIMIENTO,
      nivel: "basico",
      motivo: perfil.negocio_propio.tuvo_negocio ? "Tuvo negocio propio" : "Busca trabajar por su cuenta",
    });
  }

  return out.slice(0, MAX_SUGERENCIAS);
}
