"use client";

import { useEffect, useState } from "react";
import type { Remision } from "@/lib/remision";

/** Datos fijos de la empresa (encabezado de la remisión). */
const EMPRESA = {
  nombre: "BLACK&RED UNDERWEAR S.A.S",
  nit: "901510667-9",
  direccion: "CLL 47#52-17 INT 102",
  telefono: "3016868368",
  correo: "BLACKREDUNDERWEAR@GMAIL.COM",
};

/** Filas mínimas de la tabla (se rellena con vacías, como la plantilla). */
const MIN_FILAS = 12;

const cop = (n: number) => "$ " + new Intl.NumberFormat("es-CO").format(Math.round(n));

export default function RemisionView() {
  const [estado, setEstado] = useState<{
    status: "loading" | "empty" | "ready";
    rem?: Remision;
  }>({ status: "loading" });

  useEffect(() => {
    let next: { status: "empty" | "ready"; rem?: Remision };
    try {
      const raw = sessionStorage.getItem("remision");
      next = raw
        ? { status: "ready", rem: JSON.parse(raw) as Remision }
        : { status: "empty" };
    } catch {
      next = { status: "empty" };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado(next);
  }, []);

  if (estado.status === "loading") return null;

  if (estado.status === "empty") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-center text-black">
        <div>
          <p className="text-lg font-semibold">No hay remisión para mostrar.</p>
          <p className="mt-2 text-sm text-neutral-600">
            Generá la remisión desde la vista de Facturación.
          </p>
        </div>
      </div>
    );
  }

  const rem = estado.rem!;
  const filasVacias = Math.max(0, MIN_FILAS - rem.items.length);

  return (
    <div className="min-h-screen bg-neutral-200 py-6 text-black print:bg-white print:py-0">
      {/* Barra de acciones (no se imprime) */}
      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between px-4 print:hidden">
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-neutral-400 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          Cerrar
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-bold text-white hover:bg-black"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* Documento */}
      <div className="mx-auto max-w-[820px] bg-white p-6 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {/* Encabezado */}
            <tr>
              <td
                rowSpan={2}
                className="w-[150px] border border-black p-2 text-center align-middle"
              >
                {/* Placeholder del logo (reemplazar por el logo real) */}
                <div className="text-2xl font-black tracking-tight">BR</div>
                <div className="text-[10px] tracking-wide text-neutral-600">
                  Siéntete bien
                </div>
              </td>
              <td className="border border-black p-1 text-center">
                <div className="text-base font-bold">REMISIÓN DESPACHO</div>
                <div className="font-semibold">{EMPRESA.nombre}</div>
                <div>{EMPRESA.nit}</div>
                <div>{EMPRESA.direccion}</div>
                <div>{EMPRESA.telefono}</div>
                <div className="font-semibold underline">{EMPRESA.correo}</div>
              </td>
              <td className="w-[170px] border border-black p-2 text-center align-middle">
                <div className="text-lg font-bold">
                  REM N° {String(rem.numero).padStart(4, "0")}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Datos del cliente */}
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            <tr>
              <td className="w-[110px] border border-black bg-neutral-100 px-2 py-1 font-bold">
                FECHA:
              </td>
              <td className="border border-black px-2 py-1" colSpan={3}>
                {rem.fecha}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
                NOMBRE:
              </td>
              <td className="border border-black px-2 py-1" colSpan={3}>
                {rem.cliente.nombre}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
                DIRECCIÓN:
              </td>
              <td className="border border-black px-2 py-1">
                {rem.cliente.direccion}
              </td>
              <td className="w-[90px] border border-black bg-neutral-100 px-2 py-1 font-bold">
                CIUDAD:
              </td>
              <td className="w-[160px] border border-black px-2 py-1">
                {rem.cliente.ciudad}
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
                TELÉFONO:
              </td>
              <td className="border border-black px-2 py-1">
                {rem.cliente.telefono}
              </td>
              <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
                VENDEDOR:
              </td>
              <td className="border border-black px-2 py-1">{rem.vendedor}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla de productos */}
        <table className="mt-2 w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-100 text-center font-bold">
              <th className="w-[70px] border border-black px-2 py-1">REF.</th>
              <th className="w-[80px] border border-black px-2 py-1">CANTIDAD</th>
              <th className="border border-black px-2 py-1">DESCRIPCIÓN</th>
              <th className="w-[110px] border border-black px-2 py-1">
                VALOR UNI.
              </th>
              <th className="w-[120px] border border-black px-2 py-1">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rem.items.map((it, i) => (
              <tr key={i}>
                <td className="border border-black px-2 py-1 text-center">
                  {it.ref}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {it.cantidad}
                </td>
                <td className="border border-black px-2 py-1">
                  {it.descripcion}
                </td>
                <td className="border border-black px-2 py-1 text-right">
                  {cop(it.valorUni)}
                </td>
                <td className="border border-black px-2 py-1 text-right">
                  {cop(it.total)}
                </td>
              </tr>
            ))}
            {Array.from({ length: filasVacias }).map((_, i) => (
              <tr key={`v${i}`}>
                <td className="border border-black px-2 py-1">&nbsp;</td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1"></td>
                <td className="border border-black px-2 py-1 text-right">$ 0</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td
                className="border border-black px-2 py-1 text-right"
                colSpan={4}
              >
                TOTAL
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {cop(rem.granTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
