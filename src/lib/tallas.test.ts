import { describe, expect, it } from "vitest";
import {
  calcularRestanteTallas,
  calcularTotalCantidad,
  esCantidadTallas,
  formatTallas,
  parseTallas,
  toNumber,
} from "./tallas";

describe("esCantidadTallas", () => {
  it("detecta el formato con ':' como tallas", () => {
    expect(esCantidadTallas("S:5|M:3")).toBe(true);
    expect(esCantidadTallas("10")).toBe(false);
    expect(esCantidadTallas(10)).toBe(false);
    expect(esCantidadTallas("")).toBe(false);
  });
});

describe("parseTallas / formatTallas", () => {
  it("parsea 'S : 5 | M : 3' tolerando espacios", () => {
    expect(parseTallas("S : 5 | M : 3")).toEqual({ S: 5, M: 3 });
  });

  it("ignora tramos malformados", () => {
    expect(parseTallas("S:5|basura|M:3")).toEqual({ S: 5, M: 3 });
  });

  it("formatTallas es la inversa (sin espacios)", () => {
    expect(formatTallas({ S: 3, M: 3 })).toBe("S:3|M:3");
  });
});

describe("calcularRestanteTallas", () => {
  it("resta por talla y conserva las no despachadas", () => {
    expect(calcularRestanteTallas("S:5|M:3", "S:2")).toBe("S:3|M:3");
  });

  it("descarta las tallas que quedan en cero", () => {
    expect(calcularRestanteTallas("S:5|M:3", "S:2|M:3")).toBe("S:3");
  });

  it("despacho total deja vacío", () => {
    expect(calcularRestanteTallas("S:5|M:3", "S:5|M:3")).toBe("");
  });

  it("revienta si se despacha más de lo pedido", () => {
    expect(() => calcularRestanteTallas("S:5", "S:6")).toThrow(/talla S/);
  });
});

describe("calcularTotalCantidad", () => {
  it("suma las unidades de todas las tallas", () => {
    expect(calcularTotalCantidad("S:5|M:3")).toBe(8);
    expect(calcularTotalCantidad("S:5|M:0")).toBe(5);
  });

  it("con cantidades sueltas devuelve el número", () => {
    expect(calcularTotalCantidad("10")).toBe(10);
    expect(calcularTotalCantidad(12)).toBe(12);
  });

  it("basura da 0", () => {
    expect(calcularTotalCantidad("abc")).toBe(0);
  });
});

describe("toNumber", () => {
  it("convierte lo convertible y cae a 0 con basura", () => {
    expect(toNumber(10)).toBe(10);
    expect(toNumber("10")).toBe(10);
    expect(toNumber("")).toBe(0);
    expect(toNumber("abc")).toBe(0);
  });
});
