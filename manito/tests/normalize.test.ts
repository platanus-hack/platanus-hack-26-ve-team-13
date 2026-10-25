import { describe, expect, it } from "vitest";
import { normalizeDate, normalizeIdNumber, normalizeName, normalizePhone } from "@/lib/agent/normalize";

describe("normalizeDate", () => {
  it.each([
    ["3 de marzo de 1980", "1980-03-03"],
    ["nací el 3 de marzo de 1980", "1980-03-03"],
    ["15 de Julio del 1990", "1990-07-15"],
    ["03/03/1980", "1980-03-03"],
    ["1980-03-03", "1980-03-03"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeDate(input)).toBe(expected);
  });

  it.each(["en el 80, en marzo", "marzo de 1980", "31 de febrero de 1980", "3 de marzo de 2090", "ayer"])(
    "drops %s",
    (input) => {
      expect(normalizeDate(input)).toBeNull();
    },
  );
});

describe("normalizeIdNumber", () => {
  it.each([
    ["V-15.234.876", "V-15234876"],
    ["v 15234876", "V-15234876"],
    ["15.234.876", "V-15234876"],
    ["E-82.123.456", "E-82123456"],
    ["B-15.234.876", "V-15234876"],
    ["Sí, vigente. B15234876.", "V-15234876"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeIdNumber(input)).toBe(expected);
  });

  it.each(["no me acuerdo", "123", "B15234800-76"])("drops %s", (input) => {
    expect(normalizeIdNumber(input)).toBeNull();
  });
});

describe("normalizePhone", () => {
  it.each([
    ["0412-555-1234", "04125551234"],
    ["+58 412 555 1234", "04125551234"],
    ["412 5551234", "04125551234"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["0412-555", "el de siempre"])("drops %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("normalizeName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeName("  José   Rodríguez ")).toBe("José Rodríguez");
    expect(normalizeName("   ")).toBeNull();
  });
});
