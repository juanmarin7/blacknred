import { describe, expect, it } from "vitest";
import {
  aplicarPorcentaje,
  serializarDetalle,
  parsearDetalle,
  type Remision,
  type RemisionItem,
} from "./remision";

function remisionDe(items: RemisionItem[]): Remision {
  return {
    numero: 207,
    fecha: "13-ago-2026",
    idCliente: "C1",
    cliente: {
      nombre: "Cliente X",
      local: "Local 1",
      direccion: "Calle 1",
      telefono: "3000000000",
      ciudad: "Medellín",
    },
    vendedor: "Vendedor 1",
    items,
    granTotal: items.reduce((s, it) => s + it.total, 0),
    codigos: ["001"],
    filas: [1],
  };
}

describe("aplicarPorcentaje", () => {
  it("resta el % SOLO a la cantidad (el valor unitario no cambia) y recalcula el total", () => {
    const rem = remisionDe([
      { ref: "P1", cantidad: 100, descripcion: "Producto 1", valorUni: 5000, total: 500000 },
    ]);
    const mod = aplicarPorcentaje(rem, 10);
    expect(mod.items[0].cantidad).toBe(90);
    expect(mod.items[0].valorUni).toBe(5000); // intacto
    expect(mod.items[0].total).toBe(90 * 5000); // 450000
    expect(mod.granTotal).toBe(450000);
  });

  it("redondea la cantidad y deja el valor unitario intacto", () => {
    const rem = remisionDe([
      { ref: "P1", cantidad: 7, descripcion: "P", valorUni: 3333, total: 23331 },
    ]);
    const mod = aplicarPorcentaje(rem, 15);
    // 7 * 0.85 = 5.95 -> 6 ; valorUni intacto
    expect(mod.items[0].cantidad).toBe(6);
    expect(mod.items[0].valorUni).toBe(3333);
    expect(mod.items[0].total).toBe(6 * 3333);
  });

  it("no muta la remisión original", () => {
    const rem = remisionDe([
      { ref: "P1", cantidad: 100, descripcion: "P", valorUni: 5000, total: 500000 },
    ]);
    aplicarPorcentaje(rem, 10);
    expect(rem.items[0].cantidad).toBe(100);
    expect(rem.granTotal).toBe(500000);
  });
});

describe("serializarDetalle / parsearDetalle", () => {
  it("ida y vuelta conserva los ítems", () => {
    const items: RemisionItem[] = [
      { ref: "P1", cantidad: 90, descripcion: "Bóxer clásico", valorUni: 4500, total: 405000 },
      { ref: "P2", cantidad: 12, descripcion: "Con | pipe", valorUni: 1000, total: 12000 },
    ];
    expect(parsearDetalle(serializarDetalle(items))).toEqual(items);
  });
});
