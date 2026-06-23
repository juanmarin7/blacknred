"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import EstadoBadge from "@/components/EstadoBadge";
import LoadingOverlay from "@/components/LoadingOverlay";
import PantallaCarga from "@/components/PantallaCarga";
import Modal from "@/components/Modal";
import TallaBadges from "@/components/TallaBadges";
import { usePedidos } from "@/lib/usePedidos";
import type { PedidoRow } from "@/lib/types";

export default function FacturacionView() {
  const { pedidos, error, ultimaActualizacion, recargar } =
    usePedidos("facturacion");

  const [paraFacturar, setParaFacturar] = useState<PedidoRow | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const ordenados = (pedidos ?? [])
    .slice()
    .sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo), "es", {
        numeric: true,
      }),
    );

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

      <div className="flex-1 px-4 py-4 md:px-10">
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
                      "Codigo",
                      "Cliente",
                      "Local",
                      "Producto",
                      "Cantidad",
                      "Empaque",
                      "Descripción",
                      "Estado",
                      "Facturar",
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
                  {ordenados.map((p) => (
                    <tr
                      key={`${p.rowNumber}`}
                      className="odd:bg-surface-2 even:bg-[#232222] hover:[&>td]:bg-line-soft"
                    >
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards móvil */}
            <div className="flex flex-col gap-3.5 md:hidden">
              {ordenados.map((p) => (
                <div
                  key={`${p.rowNumber}`}
                  className="rounded-xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                >
                  <div className="border-b-2 border-wine pb-2 text-lg font-semibold text-white">
                    #{p.codigo} — {p.producto}
                  </div>
                  <CampoCard label="Cliente">{p.cliente}</CampoCard>
                  <CampoCard label="Local">{p.local}</CampoCard>
                  <CampoCard label="Cantidad">
                    <TallaBadges cantidad={p.cantidad} empaque={p.empaque} />
                  </CampoCard>
                  <CampoCard label="Empaque">{p.empaque}</CampoCard>
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
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal confirmar */}
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
