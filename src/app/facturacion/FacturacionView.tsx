"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import EstadoBadge from "@/components/EstadoBadge";
import LoadingOverlay from "@/components/LoadingOverlay";
import PantallaCarga from "@/components/PantallaCarga";
import Modal from "@/components/Modal";
import TallaBadges from "@/components/TallaBadges";
import { usePedidos } from "@/lib/usePedidos";
import { calcularTotalCantidad } from "@/lib/tallas";
import type { PedidoRow } from "@/lib/types";

const cop = (n: number) =>
  "$ " + new Intl.NumberFormat("es-CO").format(Math.round(n));

/** Valor total de una línea = cantidad (total de unidades) × precio. */
function valorLinea(p: PedidoRow): number {
  return calcularTotalCantidad(p.cantidad) * p.precio;
}

export default function FacturacionView() {
  const { pedidos, error, ultimaActualizacion, recargar } =
    usePedidos("facturacion");

  const [paraFacturar, setParaFacturar] = useState<PedidoRow | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Selección para la remisión: por CÓDIGO de pedido (todas sus líneas).
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [creandoRemision, setCreandoRemision] = useState(false);
  const [errorRemision, setErrorRemision] = useState<string | null>(null);

  const ordenados = (pedidos ?? [])
    .slice()
    .sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo), "es", {
        numeric: true,
      }),
    );

  // Cliente "activo": el del primer pedido seleccionado. Solo se pueden
  // seleccionar pedidos del mismo cliente para no cruzar la remisión.
  const filaActiva = ordenados.find((p) => seleccion.has(p.codigo));
  const clienteActivo = filaActiva?.idCliente ?? null;
  const nombreClienteActivo = filaActiva?.cliente ?? "";
  const totalSeleccion = ordenados
    .filter((p) => seleccion.has(p.codigo))
    .reduce((s, p) => s + valorLinea(p), 0);

  function bloqueada(p: PedidoRow): boolean {
    return (
      clienteActivo !== null &&
      p.idCliente !== clienteActivo &&
      !seleccion.has(p.codigo)
    );
  }

  function toggleCodigo(p: PedidoRow) {
    if (bloqueada(p)) return;
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(p.codigo)) next.delete(p.codigo);
      else next.add(p.codigo);
      return next;
    });
  }

  async function confirmarFacturar() {
    if (!paraFacturar) return;
    setProcesando(true);
    setErrorModal(null);
    try {
      const res = await fetch("/api/pedidos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          row: paraFacturar.rowNumber,
          estado: "Facturado",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      setParaFacturar(null);
      recargar();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  async function crearRemision() {
    if (seleccion.size === 0) return;
    setCreandoRemision(true);
    setErrorRemision(null);
    try {
      const res = await fetch("/api/remision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigos: [...seleccion] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      // Se pasa el documento a la vista imprimible por sessionStorage.
      sessionStorage.setItem("remision", JSON.stringify(data));
      window.open("/remision", "_blank");
      setSeleccion(new Set());
    } catch (e) {
      setErrorRemision(e instanceof Error ? e.message : "Error");
    } finally {
      setCreandoRemision(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        titulo="Facturación"
        subtitulo={
          ultimaActualizacion
            ? `Ultima actualizacion: ${ultimaActualizacion.toLocaleTimeString()}`
            : "Cargando..."
        }
      />

      <div className="flex-1 px-4 py-4 pb-24 md:px-10">
        {error && (
          <div className="mb-4 rounded-lg bg-wine p-3 text-center">{error}</div>
        )}

        {pedidos === null ? (
          <PantallaCarga />
        ) : ordenados.length === 0 ? (
          <div className="mt-20 text-center text-2xl font-light text-[#555]">
            No hay pedidos enviados por facturar
          </div>
        ) : (
          <>
            {/* Tabla escritorio */}
            <div className="animate-fade-in hidden overflow-x-auto rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.5)] md:block">
              <table className="w-full border-separate border-spacing-0 text-[15px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "",
                      "Codigo",
                      "Cliente",
                      "Local",
                      "Producto",
                      "Cantidad",
                      "Empaque",
                      "Valor total",
                      "Descripción",
                      "Estado",
                      "Facturar",
                    ].map((h, i) => (
                      <th
                        key={h || `chk-${i}`}
                        className="bg-wine px-3 py-3 text-left text-sm font-semibold tracking-wide whitespace-nowrap text-white uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((p) => {
                    const sel = seleccion.has(p.codigo);
                    return (
                      <tr
                        key={`${p.rowNumber}`}
                        className={`${
                          sel
                            ? "[&>td]:bg-wine/25"
                            : "odd:bg-surface-2 even:bg-[#232222] hover:[&>td]:bg-line-soft"
                        }`}
                      >
                        <td className="border-b border-line-soft px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={sel}
                            disabled={bloqueada(p)}
                            onChange={() => toggleCodigo(p)}
                            className="h-5 w-5 cursor-pointer accent-wine disabled:cursor-not-allowed disabled:opacity-30"
                            title={
                              bloqueada(p)
                                ? "Solo pedidos del mismo cliente"
                                : "Seleccionar para la remisión"
                            }
                          />
                        </td>
                        <td className="border-b border-line-soft px-3 py-3 font-semibold text-white">
                          {p.codigo}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          {p.cliente}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          {p.local}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          {p.producto}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          <TallaBadges cantidad={p.cantidad} empaque={p.empaque} />
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          {p.empaque}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3 font-semibold whitespace-nowrap text-white">
                          {cop(valorLinea(p))}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3">
                          {p.descripcion}
                        </td>
                        <td className="border-b border-line-soft px-3 py-3 text-center">
                          <EstadoBadge estado={p.estado} />
                        </td>
                        <td className="border-b border-line-soft px-2 py-3 text-center">
                          <button
                            onClick={() => setParaFacturar(p)}
                            className="rounded-lg bg-ok px-4 py-2 font-bold whitespace-nowrap text-white uppercase shadow-[0_2px_8px_rgba(30,155,60,0.3)] transition-all hover:-translate-y-px hover:bg-ok-hover"
                          >
                            Facturar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards móvil */}
            <div className="flex flex-col gap-3.5 md:hidden">
              {ordenados.map((p) => {
                const sel = seleccion.has(p.codigo);
                return (
                  <div
                    key={`${p.rowNumber}`}
                    className={`rounded-xl border bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${
                      sel ? "border-wine ring-1 ring-wine" : "border-line"
                    }`}
                  >
                    <div className="flex items-center gap-3 border-b-2 border-wine pb-2">
                      <input
                        type="checkbox"
                        checked={sel}
                        disabled={bloqueada(p)}
                        onChange={() => toggleCodigo(p)}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-wine disabled:opacity-30"
                      />
                      <span className="text-lg font-semibold text-white">
                        #{p.codigo} — {p.producto}
                      </span>
                    </div>
                    <CampoCard label="Cliente">{p.cliente}</CampoCard>
                    <CampoCard label="Local">{p.local}</CampoCard>
                    <CampoCard label="Cantidad">
                      <TallaBadges cantidad={p.cantidad} empaque={p.empaque} />
                    </CampoCard>
                    <CampoCard label="Empaque">{p.empaque}</CampoCard>
                    <CampoCard label="Valor total">
                      <span className="font-semibold text-white">
                        {cop(valorLinea(p))}
                      </span>
                    </CampoCard>
                    {p.descripcion && (
                      <CampoCard label="Descripción">{p.descripcion}</CampoCard>
                    )}
                    <CampoCard label="Estado">
                      <EstadoBadge estado={p.estado} />
                    </CampoCard>
                    <button
                      onClick={() => setParaFacturar(p)}
                      className="mt-3.5 w-full rounded-[10px] bg-ok py-3 text-base font-bold text-white uppercase"
                    >
                      Facturar
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Barra de acción de remisión (aparece al seleccionar) */}
      {seleccion.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-strong bg-surface/95 px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] backdrop-blur md:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-white">
              <span className="font-bold">{seleccion.size}</span> pedido(s) de{" "}
              <span className="font-semibold">{nombreClienteActivo}</span> ·{" "}
              <span className="font-semibold">{cop(totalSeleccion)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSeleccion(new Set())}
                className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-muted"
              >
                Limpiar
              </button>
              <button
                onClick={crearRemision}
                disabled={creandoRemision}
                className="rounded-lg bg-wine px-6 py-2 text-sm font-bold text-white uppercase transition-colors hover:bg-wine/80 disabled:opacity-60"
              >
                {creandoRemision ? "Generando..." : "Crear remisión"}
              </button>
            </div>
          </div>
          {errorRemision && (
            <div className="mx-auto mt-2 max-w-6xl rounded-lg border border-wine bg-wine/30 px-3 py-2 text-center text-sm text-[#ff6b6b]">
              {errorRemision}
            </div>
          )}
        </div>
      )}

      {/* Modal confirmar facturar */}
      <Modal
        abierto={Boolean(paraFacturar)}
        onCerrar={() => setParaFacturar(null)}
      >
        {paraFacturar && (
          <>
            <h2 className="mb-4 text-2xl font-bold tracking-wide uppercase">
              Facturar pedido
            </h2>
            <p className="text-base leading-relaxed text-white">
              ¿Confirmas marcar como facturado el pedido{" "}
              <strong className="text-white">#{paraFacturar.codigo}</strong> —{" "}
              {paraFacturar.producto} de{" "}
              <strong className="text-white">{paraFacturar.cliente}</strong>?
            </p>
            {errorModal && (
              <div className="mt-3 rounded-lg border border-wine bg-wine/30 px-3 py-2 text-center text-sm text-[#ff6b6b]">
                {errorModal}
              </div>
            )}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={confirmarFacturar}
                className="rounded-lg bg-ok px-7 py-3 text-lg font-semibold text-white shadow-[0_2px_8px_rgba(30,155,60,0.35)] transition-colors hover:bg-ok-hover"
              >
                Sí, facturar
              </button>
              <button
                onClick={() => setParaFacturar(null)}
                className="rounded-lg border border-line-strong px-7 py-3 text-base font-semibold text-muted"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Modal>

      <LoadingOverlay visible={procesando} texto="Guardando..." />
    </div>
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
