"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import PantallaCarga from "@/components/PantallaCarga";
import Modal from "@/components/Modal";
import type { Remision, RemisionAgrupada } from "@/lib/remision";
import RemisionDoc from "../facturacion/RemisionDoc";

const cop = (n: number) =>
  "$ " + new Intl.NumberFormat("es-CO").format(Math.round(n));

const remNum = (n: number) => (n > 0 ? String(n).padStart(4, "0") : "—");

/** Remisión efectiva a mostrar: la modificada si existe, si no la original. */
function remisionEfectiva(g: RemisionAgrupada): Remision | null {
  return (g.modificada ?? g.original)?.rem ?? null;
}

export default function RemisionesView() {
  const [remisiones, setRemisiones] = useState<RemisionAgrupada[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Overlay del documento (una remisión abierta).
  const [abierta, setAbierta] = useState<RemisionAgrupada | null>(null);
  // Dentro del overlay: ver la modificada (true) o la original (false).
  const [verModificada, setVerModificada] = useState(true);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);

  // Modal para modificar por porcentaje.
  const [modificar, setModificar] = useState<RemisionAgrupada | null>(null);
  const [pctInput, setPctInput] = useState("");
  const [modificando, setModificando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/remisiones");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setRemisiones((data.remisiones ?? []) as RemisionAgrupada[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setRemisiones([]);
    }
  }, []);

  useEffect(() => {
    // Carga inicial: el setState ocurre tras el await del fetch, no es síncrono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  // Remisión que se muestra en el overlay (según el toggle original/modificada).
  const docRem: Remision | null = abierta
    ? verModificada
      ? remisionEfectiva(abierta)
      : (abierta.original?.rem ?? null)
    : null;

  function abrir(g: RemisionAgrupada) {
    setAbierta(g);
    setVerModificada(Boolean(g.modificada)); // por defecto muestra la modificada
    setErrorDoc(null);
  }

  function abrirModificar(g: RemisionAgrupada) {
    setModificar(g);
    setPctInput(g.modificada ? String(g.modificada.pct) : "");
    setErrorModal(null);
  }

  async function confirmarModificar() {
    if (!modificar) return;
    const pct = Number(pctInput.replace(",", "."));
    if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      setErrorModal("Escribe un porcentaje entre 0 y 100.");
      return;
    }
    setModificando(true);
    setErrorModal(null);
    try {
      const res = await fetch("/api/remisiones/modificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: modificar.numero, pct }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);

      const rem = data.remision as Remision;
      // Refleja la modificada en la lista y abre el documento ya modificado.
      const actualizado: RemisionAgrupada = {
        ...modificar,
        modificada: { tipo: "modificada", pct, creadaEn: "", rem },
      };
      setRemisiones((prev) =>
        (prev ?? []).map((g) => (g.numero === modificar.numero ? actualizado : g)),
      );
      setModificar(null);
      abrir(actualizado);
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error");
    } finally {
      setModificando(false);
    }
  }

  async function descargarExcel() {
    if (!docRem) return;
    setDescargandoExcel(true);
    setErrorDoc(null);
    try {
      const res = await fetch("/api/remision/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docRem),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "No se pudo generar el Excel");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sufijo = verModificada && abierta?.modificada ? "-modificada" : "";
      a.download = `Remision-${remNum(docRem.numero)}${sufijo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorDoc(e instanceof Error ? e.message : "Error");
    } finally {
      setDescargandoExcel(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader titulo="Remisiones" subtitulo="Modificar remisiones existentes" />

      <div className="flex-1 px-4 py-4 pb-24 md:px-10">
        {error && (
          <div className="mb-4 rounded-lg bg-wine p-3 text-center">{error}</div>
        )}

        {remisiones === null ? (
          <PantallaCarga />
        ) : remisiones.length === 0 ? (
          <div className="mt-20 text-center text-2xl font-light text-[#555]">
            No hay remisiones registradas
          </div>
        ) : (
          <>
            {/* Tabla escritorio */}
            <div className="animate-fade-in hidden overflow-x-auto rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] md:block">
              <table className="w-full border-separate border-spacing-0 text-[15px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "REM N°",
                      "Fecha",
                      "Cliente",
                      "Total",
                      "Estado",
                      "Acciones",
                    ].map((h) => (
                      <th
                        key={h}
                        className="bg-wine px-3 py-3 text-left text-sm font-semibold tracking-wide whitespace-nowrap text-white uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {remisiones.map((g) => {
                    const rem = remisionEfectiva(g);
                    return (
                      <tr
                        key={g.numero}
                        className="odd:bg-surface-2 even:bg-[#232222] hover:[&>td]:bg-line-soft"
                      >
                        <td className="border-b border-line-soft px-3 py-3 font-semibold text-white">
                          {remNum(g.numero)}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3 whitespace-nowrap">
                          {rem?.fecha}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          {rem?.cliente.nombre}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3 font-semibold whitespace-nowrap text-white">
                          {cop(rem?.granTotal ?? 0)}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          <EstadoRemision g={g} />
                        </td>
                        <td className="border-b border-line-soft px-2 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => abrir(g)}
                              className="rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold text-white hover:bg-line-soft"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => abrirModificar(g)}
                              className="rounded-lg bg-wine px-3 py-2 text-sm font-bold whitespace-nowrap text-white uppercase hover:bg-wine/80"
                            >
                              Modificar %
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards móvil */}
            <div className="flex flex-col gap-3.5 md:hidden">
              {remisiones.map((g) => {
                const rem = remisionEfectiva(g);
                return (
                  <div
                    key={g.numero}
                    className="rounded-xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-center justify-between border-b-2 border-wine pb-2">
                      <span className="text-lg font-semibold text-white">
                        REM N° {remNum(g.numero)}
                      </span>
                      <EstadoRemision g={g} />
                    </div>
                    <CampoCard label="Fecha">{rem?.fecha}</CampoCard>
                    <CampoCard label="Cliente">{rem?.cliente.nombre}</CampoCard>
                    <CampoCard label="Total">
                      <span className="font-semibold text-white">
                        {cop(rem?.granTotal ?? 0)}
                      </span>
                    </CampoCard>
                    <div className="mt-3.5 flex gap-2">
                      <button
                        onClick={() => abrir(g)}
                        className="flex-1 rounded-[10px] border border-line-strong py-3 text-base font-semibold text-white"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => abrirModificar(g)}
                        className="flex-1 rounded-[10px] bg-wine py-3 text-base font-bold text-white uppercase"
                      >
                        Modificar %
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal de modificación por porcentaje */}
      <Modal abierto={Boolean(modificar)} onCerrar={() => setModificar(null)}>
        {modificar && (
          <>
            <h2 className="mb-2 text-2xl font-bold tracking-wide uppercase">
              Modificar remisión
            </h2>
            <p className="text-sm text-muted">
              REM N° {remNum(modificar.numero)} ·{" "}
              {remisionEfectiva(modificar)?.cliente.nombre}
            </p>
            <p className="mt-4 text-left text-sm leading-relaxed text-white">
              Escribe el porcentaje que se le <strong>resta</strong> a la
              remisión. Se reduce por ese % la <strong>cantidad</strong> de cada
              producto (redondeada); el valor unitario no cambia. Ej.: 100
              unidades con <strong>10%</strong> quedan en <strong>90</strong>.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                value={pctInput}
                onChange={(e) => setPctInput(e.target.value)}
                placeholder="Ej: 10"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !modificando) confirmarModificar();
                }}
                className="w-32 rounded-lg border border-line-strong bg-bg px-4 py-3 text-center text-2xl font-bold text-white outline-none focus:border-wine"
              />
              <span className="text-2xl font-bold text-white">%</span>
            </div>
            {modificar.modificada && (
              <p className="mt-3 text-xs text-muted-2">
                Esta remisión ya tiene una versión modificada (
                −{modificar.modificada.pct}%). Al guardar se reemplaza.
              </p>
            )}
            {errorModal && (
              <div className="mt-3 rounded-lg border border-wine bg-wine/30 px-3 py-2 text-center text-sm text-[#ff6b6b]">
                {errorModal}
              </div>
            )}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={confirmarModificar}
                disabled={modificando}
                className="rounded-lg bg-wine px-7 py-3 text-lg font-semibold text-white transition-colors hover:bg-wine/80 disabled:opacity-60"
              >
                {modificando ? "Modificando..." : "Aplicar"}
              </button>
              <button
                onClick={() => setModificar(null)}
                className="rounded-lg border border-line-strong px-7 py-3 text-base font-semibold text-muted"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Overlay del documento (idéntico patrón de impresión que facturación) */}
      {abierta && docRem && (
        <div
          onClick={() => setAbierta(null)}
          className="fixed inset-0 z-50 overflow-auto bg-black/70 p-4 print:bg-white print:p-0"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-w-[820px]"
          >
            <div className="print:hidden">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setAbierta(null)}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cerrar
                </button>
                <div className="flex flex-wrap gap-2">
                  {abierta.modificada && (
                    <div className="flex overflow-hidden rounded-lg border border-neutral-300">
                      <button
                        onClick={() => setVerModificada(false)}
                        className={`px-3 py-2 text-sm font-semibold ${
                          !verModificada
                            ? "bg-neutral-900 text-white"
                            : "bg-white text-neutral-700"
                        }`}
                      >
                        Original
                      </button>
                      <button
                        onClick={() => setVerModificada(true)}
                        className={`px-3 py-2 text-sm font-semibold ${
                          verModificada
                            ? "bg-neutral-900 text-white"
                            : "bg-white text-neutral-700"
                        }`}
                      >
                        Modificada −{abierta.modificada.pct}%
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => abrirModificar(abierta)}
                    className="rounded-lg border border-wine bg-wine px-4 py-2 text-sm font-bold text-white hover:bg-wine/80"
                  >
                    Modificar %
                  </button>
                  <button
                    onClick={descargarExcel}
                    disabled={descargandoExcel}
                    className="rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {descargandoExcel ? "Generando..." : "Descargar Excel"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-bold text-white hover:bg-black"
                  >
                    Imprimir / Guardar PDF
                  </button>
                </div>
              </div>
              {errorDoc && (
                <div className="mb-2 rounded-lg border border-red-400 bg-red-500/20 px-3 py-2 text-center text-sm text-red-200">
                  {errorDoc}
                </div>
              )}
            </div>
            <div className="remision-print-area">
              <RemisionDoc rem={docRem} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Badge del estado de la remisión: Original o Modificada −X%. */
function EstadoRemision({ g }: { g: RemisionAgrupada }) {
  if (g.modificada) {
    return (
      <span className="inline-block rounded-full bg-wine px-3 py-1 text-xs font-bold whitespace-nowrap text-white uppercase">
        Modificada −{g.modificada.pct}%
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full border border-line-strong px-3 py-1 text-xs font-semibold whitespace-nowrap text-muted uppercase">
      Original
    </span>
  );
}

function CampoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2 text-[15px] last:border-b-0">
      <span className="shrink-0 text-xs font-bold tracking-wide text-muted-2 uppercase">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}
