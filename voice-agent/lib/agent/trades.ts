// Banco de oficios que usan el plan de preguntas (P18, P19) y el prompt de evaluación.
// Contenido borrador: alguien que conozca cada oficio debe revisarlo (PRD sección 16).
import type { Level } from "@/lib/agent/rules";

export type Trade = {
  id: string;
  label: string;                     // nombre en español, como lo dice Manito
  aliases: string[];                 // cómo lo puede nombrar la gente; se compara sin acentos ni mayúsculas
  depth: "full" | "light";
  task: string;                      // P18: "Cuéntame paso a paso cómo {task}."
  expectedSteps: string[];           // referencia para la evaluación, nunca se lee en voz alta
  vocabulary: string[];              // términos del oficio que indican conocimiento práctico
  followUps: Record<Level, string>;  // P19, según el nivel esperado por los años declarados
  tools: string[];
};

export const TRADES: Trade[] = [
  {
    id: "masonry",
    label: "albañil",
    aliases: ["albañil", "albañileria", "albanil", "obrero de construccion", "mason", "masonry"],
    depth: "full",
    task: "frisas una pared",
    expectedSteps: [
      "Mojar o humedecer la pared",
      "Colocar las maestras (guías) con nivel o plomada",
      "Preparar la mezcla de cemento, arena y agua en la proporción correcta",
      "Lanzar la mezcla a la pared con la cuchara",
      "Emparejar con la regla (codal) apoyada en las maestras",
      "Dejar orear y terminar con la llana o el fratacho",
      "Curar el friso mojándolo los días siguientes",
    ],
    vocabulary: ["maestras", "plomada", "nivel", "codal", "regla", "llana", "fratacho", "cuchara", "orear", "curar", "proporción", "rajar"],
    followUps: {
      basic: "¿Cómo sabes que la mezcla ya tiene el punto para frisar?",
      intermediate: "¿Qué haces para que el friso no se raje cuando se seca?",
      // Coincide con el guion de la demo (PRD sección 5)
      expert: "¿Y qué haces si la mezcla te queda muy aguada?",
    },
    tools: ["cuchara", "llana", "fratacho", "regla o codal", "nivel", "plomada", "carretilla", "pala"],
  },
  {
    id: "programming",
    label: "programador",
    aliases: [
      "programador", "programadora", "programacion", "desarrollador", "desarrolladora",
      "desarrollador web", "desarrollo de software", "developer", "programmer",
    ],
    depth: "full",
    task: "arreglas un error que te reporta un cliente en su aplicación",
    expectedSteps: [
      "Pedir detalles y reproducir el error",
      "Revisar los logs o la consola para ver el mensaje de error",
      "Ubicar la parte del código que falla, depurando paso a paso si hace falta",
      "Corregir el código en una rama aparte",
      "Probar el arreglo y que no se dañe otra cosa, con pruebas si las hay",
      "Subir el cambio (commit, pull request) y desplegarlo",
      "Confirmar con el cliente que quedó resuelto",
    ],
    vocabulary: [
      "reproducir", "logs", "consola", "depurar", "debug", "breakpoint", "git", "rama",
      "commit", "pull request", "pruebas", "tests", "desplegar", "deploy", "producción",
      "base de datos", "API", "framework",
    ],
    followUps: {
      basic: "¿Qué haces cuando te sale un error que no entiendes?",
      intermediate: "¿Cómo te aseguras de que tu arreglo no dañe otra parte de la aplicación?",
      expert: "¿Qué haces si el error solo pasa en producción y no lo puedes reproducir en tu computadora?",
    },
    tools: ["laptop o computadora", "conexión a internet", "editor de código", "cuenta de GitHub o GitLab"],
  },
  {
    id: "electrical",
    label: "electricista",
    aliases: ["electricista", "electricidad", "electrician"],
    depth: "light",
    task: "instalas un tomacorriente nuevo",
    expectedSteps: [
      "Cortar la corriente en el tablero",
      "Comprobar que no hay tensión",
      "Pasar o identificar los cables: fase, neutro y tierra",
      "Conectar cada cable a su borne",
      "Fijar el tomacorriente en el cajetín, poner la tapa y probar",
    ],
    vocabulary: ["breaker", "tablero", "fase", "neutro", "tierra", "cajetín", "calibre", "multímetro"],
    followUps: {
      basic: "¿Qué es lo primero que haces antes de tocar los cables?",
      intermediate: "¿Cómo escoges el calibre del cable para un circuito?",
      expert: "¿Qué revisas cuando un breaker salta a cada rato?",
    },
    tools: ["multímetro", "pinza", "destornilladores", "pelacables", "cinta aislante"],
  },
  {
    id: "sewing",
    label: "costurera",
    aliases: ["costurera", "costurero", "costura", "modista", "sastre", "seamstress"],
    depth: "light",
    task: "le haces el ruedo a un pantalón",
    expectedSteps: [
      "Medir el largo con la persona puesta el pantalón",
      "Marcar con tiza o alfileres",
      "Cortar dejando tela para el doblez",
      "Doblar, planchar y coser a máquina o a mano",
    ],
    vocabulary: ["ruedo", "dobladillo", "tiza", "alfileres", "puntada", "overlock", "plancha"],
    followUps: {
      basic: "¿Cómo tomas la medida para que quede parejo?",
      intermediate: "¿Qué cambias si la tela es un jean grueso?",
      expert: "¿Cómo haces el ruedo de un jean para que quede como el original?",
    },
    tools: ["máquina de coser", "tijeras", "cinta métrica", "alfileres", "plancha"],
  },
  {
    id: "carpentry",
    label: "carpintero",
    aliases: ["carpintero", "carpinteria", "ebanista", "carpenter"],
    depth: "light",
    task: "instalas una puerta de madera",
    expectedSteps: [
      "Revisar que el marco esté a plomo y a escuadra",
      "Medir y ajustar la hoja al marco",
      "Marcar y hacer el rebaje de las bisagras",
      "Colgar la hoja y probar que abra y cierre sin rozar",
      "Instalar la cerradura",
    ],
    vocabulary: ["marco", "hoja", "bisagra", "escuadra", "plomo", "cepillo", "formón", "rebaje"],
    followUps: {
      basic: "¿Cómo mides para que la puerta cierre bien?",
      intermediate: "¿Qué haces si la puerta roza abajo después de colgarla?",
      expert: "¿Cómo trabajas una madera que todavía está húmeda?",
    },
    tools: ["serrucho", "cepillo", "formón", "escuadra", "martillo", "taladro"],
  },
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export function findTrade(name: string): Trade | undefined {
  const n = normalize(name);
  return TRADES.find((t) => t.id === n || t.aliases.some((a) => normalize(a) === n));
}
