"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppHeader from "@/components/AppHeader";
import LoadingOverlay from "@/components/LoadingOverlay";
import type { PeriodoResumen, ResumenVentas } from "@/lib/types";

const PERIODOS: { value: PeriodoResumen; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Últimos 7 días" },
  { value: "mes", label: "Este mes" },
];

const COLORES_ESTADO = ["#ff3b3b", "#1e9b3c", "#3c7bdb", "#d9a300", "#7b1e1e"];

const COP = (n: number) =>
  n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

const COP_CORTO = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
};

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface p-4">
      <div className="text-xs tracking-wider text-muted uppercase">{titulo}</div>
      <div className="mt-1 text-2xl font-bold text-white md:text-3xl">{valor}</div>
    </div>
  );
}

function Panel({
  titulo,
  vacio,
  children,
}: {
  titulo: string;
  vacio: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-line bg-surface p-4">
      <h3 className="mb-3 text-base font-bold text-white">{titulo}</h3>
      {vacio ? (
        <div className="py-10 text-center text-sm text-muted-2">
          Sin datos en este periodo.
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export default function TableroAdmin() {
  const [periodo, setPeriodo] = useState<PeriodoResumen>("mes");
  const [data, setData] = useState<ResumenVentas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/resumen?periodo=${periodo}`);
        const body = await res.json();
        if (!vivo) return;
        if (!res.ok) throw new Error(body?.error || "Error");
        setData(body as ResumenVentas);
        setError(null);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "Error cargando");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [periodo]);

  return (
    <div className="min-h-screen pb-16">
      <AppHeader titulo="Tablero" />

      <div className="mx-auto w-full max-w-[1000px] px-4 py-4">
        {/* Selector de periodo */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setCargando(true);
                setPeriodo(p.value);
              }}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                periodo === p.value
                  ? "border-wine bg-wine text-white"
                  : "border-line-strong text-muted hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-wine bg-wine/30 px-4 py-3 text-sm text-[#ff6b6b]">
            {error}
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            {/* Tarjetas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tarjeta titulo="Total vendido" valor={COP(data.montoTotal)} />
              <Tarjeta titulo="Pedidos" valor={String(data.numPedidos)} />
              <Tarjeta
                titulo="Ticket promedio"
                valor={COP(data.ticketPromedio)}
              />
            </div>

            {/* Ventas por día */}
            <Panel titulo="Ventas por día" vacio={data.porDia.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.porDia}>
                  <XAxis
                    dataKey="fecha"
                    tick={{ fill: "#9a9a9a", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a2a" }}
                  />
                  <YAxis
                    tickFormatter={COP_CORTO}
                    tick={{ fill: "#9a9a9a", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a2a" }}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => [COP(Number(value)), "Monto"]}
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="monto" fill="#ff3b3b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            {/* Ventas por vendedor */}
            <Panel
              titulo="Ventas por vendedor"
              vacio={data.porVendedor.length === 0}
            >
              <ResponsiveContainer
                width="100%"
                height={Math.max(160, data.porVendedor.length * 48)}
              >
                <BarChart
                  layout="vertical"
                  data={data.porVendedor}
                  margin={{ left: 8 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={COP_CORTO}
                    tick={{ fill: "#9a9a9a", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a2a" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fill: "#cfcfcf", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#2a2a2a" }}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value) => [COP(Number(value)), "Monto"]}
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="monto" fill="#7b1e1e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            {/* Pedidos por estado */}
            <Panel
              titulo="Pedidos por estado"
              vacio={data.porEstado.length === 0}
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.porEstado}
                    dataKey="pedidos"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.porEstado.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORES_ESTADO[i % COLORES_ESTADO.length]}
                      />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12, color: "#cfcfcf" }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}
      </div>

      <LoadingOverlay visible={cargando} texto="Cargando métricas..." />
    </div>
  );
}
