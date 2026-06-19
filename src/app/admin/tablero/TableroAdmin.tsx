"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
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

const NUM = (n: number) => n.toLocaleString("es-CO");

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

/** Barras horizontales por monto o por unidades (vendedores/productos/clientes). */
function BarrasHorizontales({
  data,
  dataKey = "monto",
  ejeFmt = COP_CORTO,
  tipFmt = COP,
  tipLabel = "Monto",
}: {
  data: RankingItem[];
  dataKey?: "monto" | "unidades";
  ejeFmt?: (n: number) => string;
  tipFmt?: (n: number) => string;
  tipLabel?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
      <BarChart layout="vertical" data={data} margin={{ left: 8 }}>
        <XAxis
          type="number"
          tickFormatter={ejeFmt}
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
          formatter={(value) => [tipFmt(Number(value)), tipLabel]}
          {...TOOLTIP_STYLE}
        />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colorPorIndice(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut + leyenda propia debajo (sin etiquetas externas que se desborden). */
function DonutLeyenda({
  segmentos,
  formato,
  innerRadius = 52,
  outerRadius = 80,
  height = 200,
}: {
  segmentos: { name: string; value: number; color: string }[];
  formato: (n: number) => string;
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
}) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={segmentos}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
          >
            {segmentos.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formato(Number(value)), ""]}
            {...TOOLTIP_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-col gap-1.5 text-sm">
        {segmentos.map((s) => (
          <div key={s.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.name}
            </span>
            <span className="font-semibold text-white">{formato(s.value)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Panel({
  titulo,
  vacio,
  accion,
  children,
}: {
  titulo: string;
  vacio: boolean;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">{titulo}</h3>
        {accion}
      </div>
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

function esPeriodo(v: string | null): v is PeriodoResumen {
  return PERIODOS.some((p) => p.value === v);
}

export default function TableroAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodoParam = searchParams.get("periodo");
  const periodo: PeriodoResumen = esPeriodo(periodoParam) ? periodoParam : "mes";
  const vendedor = searchParams.get("vendedor") ?? "";

  const [data, setData] = useState<ResumenVentas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoProd, setModoProd] = useState<"monto" | "unidades">("monto");

  /** Actualiza la URL (el periodo/vendedor viven en el query). */
  function navegar(cambios: { periodo?: PeriodoResumen; vendedor?: string }) {
    const per = cambios.periodo ?? periodo;
    const ven = cambios.vendedor ?? vendedor;
    const qs = new URLSearchParams();
    qs.set("periodo", per);
    if (ven) qs.set("vendedor", ven);
    setCargando(true);
    router.replace(`?${qs.toString()}`, { scroll: false });
  }

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

  const recargando = cargando && data != null;

  function exportarCSV() {
    if (!data) return;
    const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
    const generado = new Date().toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const periodoLabel =
      PERIODOS.find((p) => p.value === periodo)?.label ?? periodo;

    const filas: (string | number)[][] = [
      ["TABLERO — BLACK & RED"],
      ["Periodo", periodoLabel],
      ["Rango", `${data.rango.desde} a ${data.rango.hasta}`],
      ["Vendedor", data.vendedor ?? "Todos"],
      ["Generado", generado],
      [],
      ["RESUMEN"],
      ["Métrica", "Valor"],
      ["Total vendido", money(data.montoTotal)],
      ["Pedidos", data.numPedidos],
      ["Ticket promedio", money(data.ticketPromedio)],
      ["Facturado", money(data.montoFacturado)],
      ["Por cobrar", money(data.montoPorCobrar)],
      ["En proceso", money(data.montoEnProceso)],
      ["Pedidos sin despachar", data.sinDespachar.pedidos],
      [],
      ["VENTAS POR VENDEDOR"],
      ["Vendedor", "Monto", "Pedidos"],
      ...data.porVendedor.map((v) => [v.nombre, money(v.monto), v.pedidos]),
      [],
      ["TOP PRODUCTOS"],
      ["Producto", "Monto", "Pedidos", "Unidades"],
      ...data.topProductos.map((p) => [
        p.nombre,
        money(p.monto),
        p.pedidos,
        p.unidades ?? 0,
      ]),
      [],
      ["TOP CLIENTES"],
      ["Cliente", "Monto", "Pedidos"],
      ...data.topClientes.map((c) => [c.nombre, money(c.monto), c.pedidos]),
      [],
      ["VENTAS POR DÍA"],
      ["Día", "Monto", "Pedidos"],
      ...data.porDia.map((d) => [d.fecha, money(d.monto), d.pedidos]),
    ];

    // Separador ';' para que Excel en español lo abra en columnas.
    const esc = (c: string | number) => {
      const s = String(c);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      "sep=;\n" + filas.map((f) => f.map(esc).join(";")).join("\n");
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tablero-${periodo}${vendedor ? "-" + vendedor : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const prodData = data
    ? [...data.topProductos].sort(
        (a, b) => (b[modoProd] ?? 0) - (a[modoProd] ?? 0),
      )
    : [];

  return (
    <div className="min-h-screen pb-16">
      <AppHeader titulo="Tablero" />

      <div className="mx-auto w-full max-w-[1000px] px-4 py-4">
        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => navegar({ periodo: p.value })}
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
              onChange={(e) => navegar({ vendedor: e.target.value })}
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

        {/* Rango del periodo */}
        {data && (
          <div className="mt-2 mb-4 text-xs text-muted-2">
            {data.rango.desde} – {data.rango.hasta} · {data.numPedidos} pedidos
            {data.vendedor && <> · {data.vendedor}</>}
            {recargando && (
              <span className="ml-2 text-[#4f9cf9]">actualizando…</span>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-wine bg-wine/30 px-4 py-3 text-sm text-[#ff6b6b]">
            {error}
          </div>
        )}

        {data && (
          <div
            className={`flex flex-col gap-4 transition-opacity ${
              recargando ? "opacity-50" : ""
            }`}
          >
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

            {/* Alerta: pedidos sin despachar */}
            {data.sinDespachar.pedidos > 0 && (
              <div className="rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#f5c879]">
                ⚠ {data.sinDespachar.pedidos} pedido
                {data.sinDespachar.pedidos === 1 ? "" : "s"} sin despachar
                {data.sinDespachar.diasMasViejo > 0 && (
                  <>
                    {" "}
                    · el más antiguo hace {data.sinDespachar.diasMasViejo} día
                    {data.sinDespachar.diasMasViejo === 1 ? "" : "s"}
                  </>
                )}
              </div>
            )}

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
                <DonutLeyenda
                  formato={COP}
                  segmentos={[
                    { name: "Facturado", value: data.montoFacturado, color: "#22c55e" },
                    { name: "Por cobrar", value: data.montoPorCobrar, color: "#4f9cf9" },
                    { name: "En proceso", value: data.montoEnProceso, color: "#f59e0b" },
                  ]}
                />
              </Panel>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Top productos (monto / unidades) */}
              <Panel
                titulo="Top productos"
                vacio={data.topProductos.length === 0}
                accion={
                  <div className="flex gap-1">
                    {(["monto", "unidades"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setModoProd(m)}
                        className={`rounded border px-2 py-1 text-xs font-semibold transition-colors ${
                          modoProd === m
                            ? "border-[#4f9cf9] bg-[#4f9cf9]/20 text-white"
                            : "border-line-strong text-muted hover:text-white"
                        }`}
                      >
                        {m === "monto" ? "Monto" : "Unidades"}
                      </button>
                    ))}
                  </div>
                }
              >
                {modoProd === "monto" ? (
                  <BarrasHorizontales data={prodData} />
                ) : (
                  <BarrasHorizontales
                    data={prodData}
                    dataKey="unidades"
                    ejeFmt={NUM}
                    tipFmt={NUM}
                    tipLabel="Unidades"
                  />
                )}
              </Panel>

              {/* Top clientes */}
              <Panel titulo="Top clientes" vacio={data.topClientes.length === 0}>
                <BarrasHorizontales data={data.topClientes} />
              </Panel>
            </div>

            {/* Pedidos por estado */}
            <Panel titulo="Pedidos por estado" vacio={data.porEstado.length === 0}>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.porEstado}
                        dataKey="pedidos"
                        nameKey="estado"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {data.porEstado.map((e, i) => (
                          <Cell key={i} fill={colorEstado(e.estado, i)} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [NUM(Number(value)), "Pedidos"]}
                        {...TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-full flex-col gap-1.5 text-sm sm:flex-1">
                  {data.porEstado.map((e, i) => (
                    <div
                      key={e.estado}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2 text-muted-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: colorEstado(e.estado, i) }}
                        />
                        {e.estado}
                      </span>
                      <span className="font-semibold text-white">
                        {e.pedidos}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      <LoadingOverlay visible={cargando && !data} texto="Cargando métricas..." />
    </div>
  );
}
