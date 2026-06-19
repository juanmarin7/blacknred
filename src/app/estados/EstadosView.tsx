"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import EstadoBadge from "@/components/EstadoBadge";
import PantallaCarga from "@/components/PantallaCarga";
import TallaBadges from "@/components/TallaBadges";
import { usePedidos } from "@/lib/usePedidos";

export default function EstadosView() {
  const { pedidos, error, ultimaActualizacion } = usePedidos("estados");
  const [busqueda, setBusqueda] = useState("");

  const termino = busqueda.trim().toLowerCase();
  const filtrados = (pedidos ?? [])
    .filter(
      (p) => !termino || p.producto.toLowerCase().includes(termino),
    )
    .sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo), "es", {
        numeric: true,
      }),
    );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        titulo="Estado de pedidos"
        subtitulo={
          ultimaActualizacion
            ? `Ultima actualizacion: ${ultimaActualizacion.toLocaleTimeString()}`
            : "Cargando..."
        }
      />

      <div className="px-4 pt-4 md:px-10">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por producto..."
          className="w-full rounded-lg border border-line-strong bg-surface px-4 py-3 text-base text-white transition-colors focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex-1 px-4 py-4 md:px-10">
        {error && (
          <div className="mb-4 rounded-lg bg-wine p-3 text-center">{error}</div>
        )}

        {pedidos === null ? (
          <PantallaCarga />
        ) : filtrados.length === 0 ? (
          <div className="mt-20 text-center text-2xl font-light text-[#555]">
            {termino ? "Sin resultados para la búsqueda" : "No hay pedidos"}
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
                      "Producto",
                      "Cantidad",
                      "Empaque",
                      "Color",
                      "Cliente",
                      "Local",
                      "Descripción",
                      "Estado",
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
                  {filtrados.map((p) => (
                    <tr
                      key={`${p.rowNumber}`}
                      className="odd:bg-surface-2 even:bg-surface hover:[&>td]:bg-line-soft"
                    >
                      <td className="border-b border-line-soft px-3 py-3 font-semibold text-white">
                        {p.codigo}
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
                      <td className="border-b border-line-soft px-3 py-3 text-center font-bold text-accent-soft">
                        {p.color}
                      </td>
                      <td className="border-b border-line-soft px-3 py-3">
                        {p.cliente}
                      </td>
                      <td className="border-b border-line-soft px-3 py-3">
                        {p.local}
                      </td>
                      <td className="border-b border-line-soft px-3 py-3">
                        {p.descripcion}
                      </td>
                      <td className="border-b border-line-soft px-3 py-3 text-center">
                        <EstadoBadge estado={p.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards móvil */}
            <div className="flex flex-col gap-3.5 md:hidden">
              {filtrados.map((p) => (
                <div
                  key={`${p.rowNumber}`}
                  className="rounded-xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-center justify-between border-b-2 border-wine pb-2">
                    <span className="text-lg font-semibold text-white">
                      #{p.codigo} — {p.producto}
                    </span>
                  </div>
                  <CampoCard label="Cantidad">
                    <TallaBadges cantidad={p.cantidad} empaque={p.empaque} />
                  </CampoCard>
                  <CampoCard label="Empaque">{p.empaque}</CampoCard>
                  {p.color && (
                    <CampoCard label="Color">
                      <span className="font-bold text-accent-soft">
                        {p.color}
                      </span>
                    </CampoCard>
                  )}
                  <CampoCard label="Cliente">{p.cliente}</CampoCard>
                  <CampoCard label="Local">{p.local}</CampoCard>
                  {p.descripcion && (
                    <CampoCard label="Descripción">{p.descripcion}</CampoCard>
                  )}
                  <CampoCard label="Estado">
                    <EstadoBadge estado={p.estado} />
                  </CampoCard>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
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
