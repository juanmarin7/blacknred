"use client";

import { LOGO_URL, LOGO_FOOTER_URL } from "@/lib/branding";
import TallaBadges from "@/components/TallaBadges";
import { usePedidos } from "@/lib/usePedidos";

/**
 * Vista Pendientes TV: tipografía grande, solo lectura, sin botones.
 * Recarga sola cuando cambia la hoja (firma Cantidad+Estado cada 15s).
 */
export default function TvView({ tvKey }: { tvKey?: string }) {
  const { pedidos, error, ultimaActualizacion } = usePedidos(
    "despacho",
    tvKey,
  );

  const ordenados = (pedidos ?? [])
    .slice()
    .sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo), "es", {
        numeric: true,
      }),
    );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-5 border-b-2 border-wine bg-gradient-to-b from-surface to-base px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="Black & Red"
          className="h-[70px] shrink-0 object-contain"
        />
        <div className="flex-1 py-2 text-center">
          <h1 className="text-[40px] font-bold tracking-wide uppercase">
            Pedidos en despacho
          </h1>
          <div className="dot-vivo flex items-center justify-center gap-2 text-[23px] text-muted-2">
            {ultimaActualizacion
              ? `Ultima actualizacion: ${ultimaActualizacion.toLocaleTimeString()}`
              : "Ultima actualizacion --:--"}
          </div>
        </div>
      </header>

      <div className="w-full flex-1 overflow-x-auto px-6 py-4">
        {error ? (
          <div className="empty mt-20 text-center text-3xl font-light text-[#555]">
            Error cargando pedidos
          </div>
        ) : pedidos === null ? (
          <div className="mt-20 text-center text-3xl font-light text-[#555]">
            Cargando...
          </div>
        ) : ordenados.length === 0 ? (
          <div className="mt-20 text-center text-3xl font-light text-[#555]">
            No hay pedidos en estado Pendiente
          </div>
        ) : (
          <table className="animate-fade-in w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl text-[26px] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <thead className="sticky top-0 z-10">
              <tr>
                <Th w="7%">Codigo</Th>
                <Th w="16%">Producto</Th>
                <Th w="12%">Cantidad</Th>
                <Th w="8%">Empaque</Th>
                <Th w="8%" center>
                  Color
                </Th>
                <Th w="16%">Cliente</Th>
                <Th w="14%">Local</Th>
                <Th w="12%">Descripción</Th>
                <Th w="10%" center>
                  Estado
                </Th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((p) => (
                <tr
                  key={`${p.rowNumber}`}
                  className="odd:bg-surface-2 even:bg-surface"
                >
                  <Td className="font-semibold text-white">{p.codigo}</Td>
                  <Td>{p.producto}</Td>
                  <Td>
                    <TallaBadges
                      cantidad={p.cantidad}
                      empaque={p.empaque}
                      grande
                    />
                  </Td>
                  <Td>{p.empaque}</Td>
                  <Td className="text-center font-bold text-accent-soft">
                    {p.color}
                  </Td>
                  <Td>{p.cliente}</Td>
                  <Td>{p.local}</Td>
                  <Td>{p.descripcion}</Td>
                  <Td className="text-center">
                    <span className="inline-block rounded-lg bg-ok px-2.5 py-1 text-2xl font-bold tracking-wide whitespace-nowrap text-white uppercase shadow-[0_2px_8px_rgba(30,155,60,0.35)]">
                      {p.estado}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="mt-auto flex items-center justify-center gap-14 border-t border-line-soft px-6 py-4 opacity-75">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_FOOTER_URL}
          alt="Black & Red"
          className="h-9 object-contain"
        />
      </footer>
    </div>
  );
}

function Th({
  children,
  w,
  center,
}: {
  children: React.ReactNode;
  w: string;
  center?: boolean;
}) {
  return (
    <th
      style={{ width: w }}
      className={`overflow-hidden bg-wine px-2 py-1.5 text-[28px] font-semibold tracking-wide text-ellipsis whitespace-nowrap text-white uppercase ${
        center ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`overflow-hidden border-b border-line-soft px-1.5 py-1 align-middle text-ellipsis ${className}`}
    >
      {children}
    </td>
  );
}
