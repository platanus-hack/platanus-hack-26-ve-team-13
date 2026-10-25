// Palabras que Scribe debe reconocer mejor (máximo 50, de hasta 20 caracteres cada una)
import { TRADES } from "@/lib/agent/trades";

const MAX = 50;

const FIXED = [
  "Manito", "Impaktemos", "cédula", "vigente", "WhatsApp", "terremoto", "RIF",
  "La Guaira", "Catia La Mar", "La Lucha", "Ciudad Piar", "frisar", "friso",
];

// Primero los nombres de los oficios; luego el vocabulario de cada oficio por turnos,
// para que ninguno se quede fuera cuando se llega al máximo
function build(): string[] {
  const vocab = TRADES.map((t) => [...t.vocabulary]);
  const interleaved: string[] = [];
  for (let i = 0; vocab.some((v) => i < v.length); i++) {
    for (const v of vocab) if (v[i]) interleaved.push(v[i]);
  }
  return [...new Set([...FIXED, ...TRADES.map((t) => t.label), ...interleaved])]
    .filter((k) => k.length <= 20)
    .slice(0, MAX);
}

export const KEYTERMS = build();
