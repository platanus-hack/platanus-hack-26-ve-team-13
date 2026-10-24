import { describe, expect, it } from "vitest";
import { numberToWords, speakable } from "@/lib/voice/spoken";

describe("numberToWords", () => {
  it.each([
    [0, "cero"],
    [7, "siete"],
    [16, "dieciséis"],
    [21, "veintiuno"],
    [45, "cuarenta y cinco"],
    [100, "cien"],
    [101, "ciento uno"],
    [234, "doscientos treinta y cuatro"],
    [876, "ochocientos setenta y seis"],
    [1000, "mil"],
    [1980, "mil novecientos ochenta"],
    [2004, "dos mil cuatro"],
    [21000, "veintiún mil"],
    [1_000_000, "un millón"],
    [15_234_876, "quince millones doscientos treinta y cuatro mil ochocientos setenta y seis"],
  ])("%i → %s", (n, words) => {
    expect(numberToWords(n)).toBe(words);
  });
});

describe("speakable", () => {
  it("reads a phone number digit by digit, in groups", () => {
    expect(speakable("teléfono 0412-555-1234. ¿Está bien?")).toBe(
      "teléfono cero cuatro uno dos, cinco cinco cinco, uno dos tres cuatro. ¿Está bien?",
    );
  });

  it("reads a cédula by its groups", () => {
    expect(speakable("cédula V-15.234.876.")).toBe(
      "cédula ve, quince, doscientos treinta y cuatro, ochocientos setenta y seis.",
    );
  });

  it("reads a date with the year in words", () => {
    expect(speakable("fecha de nacimiento 3 de marzo de 1980")).toBe(
      "fecha de nacimiento tres de marzo de mil novecientos ochenta",
    );
    expect(speakable("1 de enero de 2001")).toBe("primero de enero de dos mil uno");
  });

  it("leaves text without numbers alone", () => {
    expect(speakable("¿A qué número te escribimos por WhatsApp?")).toBe("¿A qué número te escribimos por WhatsApp?");
  });
});
