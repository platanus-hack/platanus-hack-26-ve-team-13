// Normalizadores de lo que dijo la persona. Devuelven null si no se puede
// normalizar con seguridad: el campo queda vacío y la conversación sigue.

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

function isoDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  const valid =
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
  if (!valid || year < 1900 || d.getTime() > Date.now()) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "3 de marzo de 1980", "03/03/1980" (día primero) o "1980-03-03" → "1980-03-03".
// Sin día, mes y año de 4 dígitos ("en el 80, en marzo") → null.
export function normalizeDate(input: string): string | null {
  const s = stripAccents(input.toLowerCase()).trim();

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return isoDate(+iso[1], +iso[2], +iso[3]);

  const numeric = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (numeric) return isoDate(+numeric[3], +numeric[2], +numeric[1]);

  const spoken = s.match(/\b(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+|del\s+)?(\d{4})\b/);
  if (spoken && MONTHS[spoken[2]]) return isoDate(+spoken[3], MONTHS[spoken[2]], +spoken[1]);

  return null;
}

// "V-15.234.876", "v 15234876", "15.234.876" → "V-15234876"; extranjeros "E-…".
// El reconocimiento de voz escribe "B" por "V" (suenan igual) y a veces parte los
// dígitos ("B15234800-76"): si no queda una cédula válida, mejor vacío que equivocada.
export function normalizeIdNumber(input: string): string | null {
  const m = input.toUpperCase().match(/\b([VEB])?\s*-?\s*(\d[\d.\s-]{4,14}\d)\b/);
  if (!m) return null;
  const digits = m[2].replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 9) return null;
  const letter = m[1] === "E" ? "E" : "V";
  return `${letter}-${digits}`;
}

// "0412-555-1234", "+58 412 555 1234", "412 5551234" → "04125551234"
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("58")) digits = "0" + digits.slice(2);
  if (digits.length === 10 && !digits.startsWith("0")) digits = "0" + digits;
  return /^0\d{10}$/.test(digits) ? digits : null;
}

export function normalizeName(input: string): string | null {
  const s = input.replace(/\s+/g, " ").trim();
  return s.length > 0 ? s : null;
}
