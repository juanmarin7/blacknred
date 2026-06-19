"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
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
import type { PeriodoResumen, RankingItem, ResumenVentas } from "@/lib/types";

const PERIODOS: { value: PeriodoResumen; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Últimos 7 días" },
  { value: "mes", label: "Este mes" },
];

/**
 * Paleta de la analítica: variada y suave sobre fondo oscuro (el rojo de la
 * marca se reserva como acento, no se usa para llenar gráficos). Centralizada
 * aquí para que nuevos paneles/cálculos reutilicen los mismos colores.
 */
const PALETA = [
  "#4f9cf9", // azul
  "#22c55e", // verde
  "#a78bfa", // morado
  "#f59e0b", // ámbar
  "#2dd4bf", // teal
  "#f472b6", // rosa
  "#60a5fa", // azul claro
  "#fb923c", // naranja
];

const COLOR_SERIE = "#4f9cf9"; // color base para series de un solo valor (por día)

/** Color por índice (vendedores u otras categorías). */
const colorPorIndice = (i: number) => PALETA[i % PALETA.length];

/** Color semántico por estado del pedido; cae a la paleta si no se reconoce. */
function colorEstado(estado: string, i: number): string {
  const e = estado.toLowerCase();
  if (e.includes("facturad")) return "#22c55e"; // verde = cobrado
  if (e.includes("enviad")) return "#4f9cf9"; // azul = despachado
  if (e.includes("parcial")) return "#a78bfa"; // morado = parcial
  if (e.includes("modificad")) return "#2dd4bf"; // teal
  if (e.includes("pedido")) return "#f59e0b"; // ámbar = pendiente
  return colorPorIndice(i);
}

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

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    color: "#fff",
  },
  labelStyle: { color: "#fff", fontWeight: 600 },
  itemStyle: { color: "#fff" },
  cursor: { fill: "rgba(255,255,255,0.05)" },
} as const;

function Tarjeta({
  titulo,
  valor,
  delta,
}: {
  titulo: string;
  valor: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-surface p-4">
      <div className="text-xs tracking-wider text-muted uppercase">{titulo}</div>
      <div className="mt-1 text-2xl font-bold text-white md:text-3xl">{valor}</div>
      {delta != null && (
        <div
          className={`mt-1 text-xs font-semibold ${
            delta >= 0 ? "text-[#22c55e]" : "text-[#ff6b6b]"
          }`}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%{" "}
          <span className="font-normal text-muted">vs anterior</span>
        </div>
      )}
    </div>
  );
}

/** Barras horizontales por monto (vendedores, productos, clientes). */
function BarrasHorizontales({ data }: { data: RankingItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8 }}>
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
          width={130}
        />
        <Tooltip
          formatter={(value) => [COP(Number(value)), "Monto"]}
          {...TOOLTIP_STYLE}
        />
        <Bar dataKey="monto" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colorPorIndice(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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
  const [vendedor, setVendedor] = useState(""); // "" = todos
  const [data, setData] = useState<ResumenVentas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const qs = new URLSearchParams({ periodo });
        if (vendedor) qs.set("vendedor", vendedor);
        const res = await fetch(`/api/admin/resumen?${qs.toString()}`);
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
  }, [periodo, vendedor]);

  function exportarCSV() {
    if (!data) return;
    const filas: (string | number)[][] = [
      ["Resumen", PERIODOS.find((p) => p.value === periodo)?.label ?? periodo],
      ["Vendedor", data.vendedor ?? "Todos"],
      [],
      ["Métrica", "Valor"],
      ["Total vendido", data.montoTotal],
      ["Pedidos", data.numPedidos],
      ["Ticket promedio", data.ticketPromedio],
      ["Facturado", data.montoFacturado],
      ["Por cobrar", data.montoPorCobrar],
      ["En proceso", data.montoEnProceso],
      [],
      ["Vendedor", "Monto", "Pedidos"],
      ...data.porVendedor.map((v) => [v.nombre, v.monto, v.pedidos]),
      [],
      ["Producto", "Monto", "Pedidos"],
      ...data.topProductos.map((p) => [p.nombre, p.monto, p.pedidos]),
      [],
      ["Cliente", "Monto", "Pedidos"],
      ...data.topClientes.map((c) => [c.nombre, c.monto, c.pedidos]),
      [],
      ["Día", "Monto", "Pedidos"],
      ...data.porDia.map((d) => [d.fecha, d.monto, d.pedidos]),
    ];
    const csv = filas
      .map((f) =>
        f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tablero-${periodo}${vendedor ? "-" + vendedor : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen pb-16">
      <AppHeader titulo="Tablero" />

      <div className="mx-auto w-full max-w-[1000px] px-4 py-4">
        {/* Controles */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setCargando(true);
                setPeriodo(p.value);
              }}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
                periodo === p.value
                  ? "border-[#4f9cf9] bg-[#4f9cf9]/20 text-white"
                  : "border-line-strong text-muted hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={vendedor}
              onChange={(e) => {
                setCargando(true);
                setVendedor(e.target.value);
              }}
              className="rounded-md border border-line-strong bg-surface-2 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="">Todos los vendedores</option>
              {data?.vendedoresDisponibles.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button
              onClick={exportarCSV}
              disabled={!data}
              className="rounded-md border border-line-strong px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-white disabled:opacity-50"
            >
              ⭳ CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-wine bg-wine/30 px-4 py-3 text-sm text-[#ff6b6b]">
            {error}
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            {/* Tarjetas */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tarjeta
                titulo="Total vendido"
                valor={COP(data.montoTotal)}
                delta={data.comparativo.variacionMonto}
              />
              <Tarjeta
                titulo="Pedidos"
                valor={String(data.numPedidos)}
                delta={data.comparativo.variacionPedidos}
              />
              <Tarjeta
                titulo="Ticket promedio"
                valor={COP(data.ticketPromedio)}
              />
              <Tarjeta titulo="Por cobrar" valor={COP(data.montoPorCobrar)} />
            </div>

            {/* Tendencia de ventas por día */}
            <Panel titulo="Tendencia de ventas" vacio={data.porDia.length === 0}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.porDia}>
                  <defs>
                    <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_SERIE} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={COLOR_SERIE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    {...TOOLTIP_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="monto"
                    stroke={COLOR_SERIE}
                    strokeWidth={2}
                    fill="url(#gradVentas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Ventas por vendedor (oculto si se filtró a uno solo) */}
              {!data.vendedor && (
                <Panel
                  titulo="Ventas por vendedor"
                  vacio={data.porVendedor.length === 0}
                >
                  <BarrasHorizontales data={data.porVendedor} />
                </Panel>
              )}

              {/* Estado de cobro */}
              <Panel titulo="Estado de cobro" vacio={data.montoTotal === 0}>
                {(() => {
                  const cobro = [
                    { name: "Facturado", value: data.montoFacturado, color: "#22c55e" },
                    { name: "Por cobrar", value: data.montoPorCobrar, color: "#4f9cf9" },
                    { name: "En proceso", value: data.montoEnProceso, color: "#f59e0b" },
                  ];
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={cobro}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {cobro.map((c) => (
                              <Cell key={c.name} fill={c.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [COP(Number(value)), "Monto"]}
                            {...TOOLTIP_STYLE}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-2 flex flex-col gap-1.5 text-sm">
                        {cobro.map((c) => (
                          <div
                            key={c.name}
                            className="flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2 text-muted-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: c.color }}
                              />
                              {c.name}
                            </span>
                            <span className="font-semibold text-white">
                              {COP(c.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </Panel>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Top productos */}
              <Panel
                titulo="Top productos"
                vacio={data.topProductos.length === 0}
              >
                <BarrasHorizontales data={data.topProductos} />
              </Panel>

              {/* Top clientes */}
              <Panel titulo="Top clientes" vacio={data.topClientes.length === 0}>
                <BarrasHorizontales data={data.topClientes} />
              </Panel>
            </div>

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
                    {data.porEstado.map((e, i) => (
                      <Cell key={i} fill={colorEstado(e.estado, i)} />
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
