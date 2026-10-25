// Convierte números a palabras para la voz: la pantalla muestra "0412-555-1234",
// Manito dice "cero cuatro uno dos, cinco cinco cinco, uno dos tres cuatro".

const UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const TEENS = [
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos",
  "ochocientos", "novecientos",
];

function below100(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 30) return TEENS[n - 10];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${TENS[t]} y ${UNITS[u]}` : TENS[t];
}

function below1000(n: number): string {
  if (n === 100) return "cien";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? HUNDREDS[h] : "", rest || !h ? below100(rest) : ""].filter(Boolean).join(" ");
}

// "uno" delante de "mil" o "millones" se dice "un" ("veintiún mil", "un millón")
const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e9) return String(n);
  if (n < 1000) return below1000(n);
  const millions = Math.floor(n / 1e6);
  const thousands = Math.floor((n % 1e6) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "un millón" : `${apocope(below1000(millions))} millones`);
  if (thousands) parts.push(thousands === 1 ? "mil" : `${apocope(below1000(thousands))} mil`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

const digits = (s: string) => [...s].map((d) => UNITS[+d]).join(" ");

const MONTHS = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre";

export function speakable(text: string): string {
  return text
    // Teléfono: dígito por dígito, en los mismos grupos que se escriben
    .replace(/\b(0\d{3})-(\d{3})-(\d{4})\b/g, (_, a, b, c) => `${digits(a)}, ${digits(b)}, ${digits(c)}`)
    // Cédula: la letra y luego el número por grupos, como se escribe con puntos
    .replace(/\b([VE])-(\d{1,3}(?:\.\d{3})+)\b/g, (_, letter: string, num: string) =>
      `${letter === "V" ? "ve" : "e"}, ${num.split(".").map((g) => numberToWords(+g)).join(", ")}`)
    // Fecha: "1 de marzo de 1980" → "primero de marzo de mil novecientos ochenta"
    .replace(new RegExp(`\\b(\\d{1,2}) de (${MONTHS}) de (\\d{4})\\b`, "g"), (_, d, m, y) =>
      `${+d === 1 ? "primero" : numberToWords(+d)} de ${m} de ${numberToWords(+y)}`)
    // Cualquier otro número
    .replace(/\d+/g, (n) => numberToWords(+n));
}
