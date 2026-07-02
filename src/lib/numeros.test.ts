import { describe, expect, it } from "vitest";
import { parseNumeroCO } from "./numeros";

describe("parseNumeroCO", () => {
  it("deja pasar los números tal cual", () => {
    expect(parseNumeroCO(43000)).toBe(43000);
    expect(parseNumeroCO(0)).toBe(0);
    expect(parseNumeroCO(47.5)).toBe(47.5);
  });

  it("interpreta el punto como separador de miles (el bug de 43.000)", () => {
    expect(parseNumeroCO("43.000")).toBe(43000);
    expect(parseNumeroCO("1.000")).toBe(1000);
    expect(parseNumeroCO("1.234.567")).toBe(1234567);
  });

  it("interpreta la coma como decimal", () => {
    expect(parseNumeroCO("1.234,50")).toBe(1234.5);
    expect(parseNumeroCO("0,5")).toBe(0.5);
  });

  it("ignora símbolos de moneda y espacios", () => {
    expect(parseNumeroCO("$47.000")).toBe(47000);
    expect(parseNumeroCO(" 1.000 ")).toBe(1000);
    expect(parseNumeroCO("$ 12.500,25")).toBe(12500.25);
  });

  it("respeta negativos (útil para restas de cantidades)", () => {
    expect(parseNumeroCO("-1.000")).toBe(-1000);
  });

  it("devuelve 0 ante vacío o basura", () => {
    expect(parseNumeroCO("")).toBe(0);
    expect(parseNumeroCO(null)).toBe(0);
    expect(parseNumeroCO(undefined)).toBe(0);
    expect(parseNumeroCO("abc")).toBe(0);
  });
});
