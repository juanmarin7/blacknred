"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import EstadoBadge from "@/components/EstadoBadge";
import LoadingOverlay from "@/components/LoadingOverlay";
import PantallaCarga from "@/components/PantallaCarga";
import Modal from "@/components/Modal";
import TallaBadges from "@/components/TallaBadges";
import { usePedidos } from "@/lib/usePedidos";
import { calcularTotalCantidad } from "@/lib/tallas";
import type { PedidoRow } from "@/lib/types";
import type { Remision } from "@/lib/remision";
import RemisionDoc from "./RemisionDoc";

const cop = (n: number) =>
  "$ " + new Intl.NumberFormat("es-CO").format(Math.round(n));

/** Valor total de una línea = cantidad (total de unidades) × precio. */
function valorLinea(p: PedidoRow): number {
  return calcularTotalCantidad(p.cantidad) * p.precio;
}

/**
 * Reutilización del REM N°: si hoy ya se asignó un número para un cliente
 * (p. ej. imprimieron y notaron que faltó un pedido y rearman la remisión),
 * la nueva sale con el MISMO número en vez de gastar otro consecutivo.
 *
 * Condición para reutilizar AUTOMÁTICO (para no trucar números de remisiones
 * distintas del mismo cliente): mismo cliente + mismo día + la nueva remisión
 * COMPARTE al menos un pedido (fila) con la que recibió el número. Una remisión
 * posterior del mismo cliente con pedidos totalmente distintos NO reutiliza
 * (consume número nuevo); solo se informa y se deja forzar a mano.
 * Se recuerda por navegador (localStorage), solo lo del día (fecha del server).
 */
const STORAGE_REM = "remNumAsignados";

type AsignacionRem = { numero: number; fecha: string; filas: number[] };
type AsignacionesRem = Record<string, AsignacionRem>;

function leerAsignacionesRem(): AsignacionesRem {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_REM) || "{}");
  } catch {
    return {};
  }
}

function guardarAsignacionRem(
  cliente: string,
  numero: number,
  fecha: string,
  filas: number[],
) {
  // Solo se conservan las asignaciones de hoy, para no crecer indefinido.
  const hoy: AsignacionesRem = {};
  for (const [k, v] of Object.entries(leerAsignacionesRem())) {
    if (v.fecha === fecha) hoy[k] = v;
  }
  hoy[cliente] = { numero, fecha, filas };
  try {
    localStorage.setItem(STORAGE_REM, JSON.stringify(hoy));
  } catch {
    // sin localStorage (modo privado): simplemente no se reutiliza
  }
}

/** Asignación de HOY para este cliente, si existe (con o sin cruce de filas). */
function asignacionHoy(cliente: string, fecha: string): AsignacionRem | null {
  const v = leerAsignacionesRem()[cliente];
  return v && v.fecha === fecha ? v : null;
}

function compartenFilas(a: number[], b: number[]): boolean {
  const set = new Set(a);
  return b.some((n) => set.has(n));
}

export default function FacturacionView() {
  const { pedidos, error, ultimaActualizacion, recargar } =
    usePedidos("facturacion");

  const [paraFacturar, setParaFacturar] = useState<PedidoRow | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Selección para la remisión: por FILA (rowNumber, siempre único). Cada
  // checkbox es independiente; no arrastra otras filas ni otros pedidos.
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [creandoRemision, setCreandoRemision] = useState(false);
  const [errorRemision, setErrorRemision] = useState<string | null>(null);
  // Remisión generada: se muestra en un overlay dentro de esta misma vista.
  // El número (numero) empieza en 0 y se asigna al imprimir (no al previsualizar).
  const [remision, setRemision] = useState<Remision | null>(null);
  const [asignandoNumero, setAsignandoNumero] = useState(false);
  const [imprimirPend, setImprimirPend] = useState(false);
  // true si el REM N° mostrado se reutilizó de una asignación previa de hoy.
  const [numeroReutilizado, setNumeroReutilizado] = useState(false);
  // N° asignado hoy al mismo cliente pero para OTROS pedidos (sin cruce):
  // no se reutiliza automático, solo se informa y se puede forzar.
  const [numeroPrevioOtros, setNumeroPrevioOtros] = useState(0);

  const ordenados = (pedidos ?? [])
    .slice()
    .sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo), "es", {
        numeric: true,
      }),
    );

  // Cliente "activo": el de la primera fila seleccionada. Solo se pueden
  // seleccionar filas del mismo cliente para no cruzar la remisión.
  const clienteKey = (p: PedidoRow) => p.idCliente || p.cliente;
  const filaActiva = ordenados.find((p) => seleccion.has(p.rowNumber));
  const clienteActivo = filaActiva ? clienteKey(filaActiva) : null;
  const nombreClienteActivo = filaActiva?.cliente ?? "";
  const totalSeleccion = ordenados
    .filter((p) => seleccion.has(p.rowNumber))
    .reduce((s, p) => s + valorLinea(p), 0);

  function bloqueada(p: PedidoRow): boolean {
    return (
      clienteActivo !== null &&
      clienteKey(p) !== clienteActivo &&
      !seleccion.has(p.rowNumber)
    );
  }

  function toggleFila(p: PedidoRow) {
    if (bloqueada(p)) return;
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(p.rowNumber)) next.delete(p.rowNumber);
      else next.add(p.rowNumber);
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
        body: JSON.stringify({ filas: [...seleccion] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      // Se muestra en un overlay dentro de esta misma vista (sin cambiar de tab).
      // Reutilización del REM N° asignado hoy a este cliente: automática SOLO
      // si la remisión rearmada comparte pedidos con la que recibió el número
      // (p. ej. la repitieron porque faltó un pedido). Si es del mismo cliente
      // pero con pedidos totalmente distintos, NO se reutiliza: se informa.
      const rem = data as Remision;
      const previa = asignacionHoy(rem.idCliente, rem.fecha);
      const esLaMisma = previa !== null && compartenFilas(previa.filas, rem.filas);
      setNumeroReutilizado(esLaMisma);
      setNumeroPrevioOtros(!esLaMisma && previa ? previa.numero : 0);
      if (esLaMisma && previa) {
        // La versión rearmada pasa a ser "la" remisión de ese número: se
        // recuerdan sus filas (unión) para próximos rearmes.
        guardarAsignacionRem(rem.idCliente, previa.numero, rem.fecha, [
          ...new Set([...previa.filas, ...rem.filas]),
        ]);
      }
      setRemision(esLaMisma && previa ? { ...rem, numero: previa.numero } : rem);
      setSeleccion(new Set());
    } catch (e) {
      setErrorRemision(e instanceof Error ? e.message : "Error");
    } finally {
      setCreandoRemision(false);
    }
  }

  // Guarda la remisión en la hoja histórica `Remisiones` (upsert por REM N°).
  async function guardarRegistroRemision(rem: Remision) {
    const res = await fetch("/api/remision/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rem),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new Error(d?.error || "No se pudo registrar la remisión");
    }
  }

  // Imprime la remisión. Asigna el número atómico la PRIMERA vez (si numero>0 ya
  // fue asignado, reimprime el mismo sin consumir otro consecutivo) y, en todos
  // los casos, la registra en la hoja histórica antes de imprimir (idempotente).
  async function imprimir() {
    if (!remision) return;
    setAsignandoNumero(true);
    setErrorRemision(null);
    try {
      let num = remision.numero;
      if (num <= 0) {
        const res = await fetch("/api/remision/numero", { method: "POST" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
        num = data.numero as number;
        guardarAsignacionRem(remision.idCliente, num, remision.fecha, remision.filas);
        setRemision((r) => (r ? { ...r, numero: num } : r));
      }
      // Persistir con el número ya firme (sirve para original, reimpresión y rearme).
      await guardarRegistroRemision({ ...remision, numero: num });
      setImprimirPend(true); // el efecto imprime cuando el número está en el DOM
    } catch (e) {
      setErrorRemision(e instanceof Error ? e.message : "Error");
    } finally {
      setAsignandoNumero(false);
    }
  }

  // Para el caso raro de un SEGUNDO despacho legítimo del mismo cliente en el
  // día: descarta el número reutilizado y consume un consecutivo nuevo.
  async function usarNumeroNuevo() {
    if (!remision) return;
    setAsignandoNumero(true);
    setErrorRemision(null);
    try {
      const res = await fetch("/api/remision/numero", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      guardarAsignacionRem(
        remision.idCliente,
        data.numero,
        remision.fecha,
        remision.filas,
      );
      setNumeroReutilizado(false);
      setRemision((r) => (r ? { ...r, numero: data.numero as number } : r));
    } catch (e) {
      setErrorRemision(e instanceof Error ? e.message : "Error");
    } finally {
      setAsignandoNumero(false);
    }
  }

  // Fuerza a mano el número ya asignado hoy a este cliente (caso: la remisión
  // rearmada no comparte pedidos con la original pero SÍ la reemplaza).
  function usarNumeroPrevio() {
    if (!remision || numeroPrevioOtros <= 0) return;
    const previa = asignacionHoy(remision.idCliente, remision.fecha);
    guardarAsignacionRem(remision.idCliente, numeroPrevioOtros, remision.fecha, [
      ...new Set([...(previa?.filas ?? []), ...remision.filas]),
    ]);
    setNumeroReutilizado(true);
    setNumeroPrevioOtros(0);
    setRemision((r) => (r ? { ...r, numero: numeroPrevioOtros } : r));
  }

  // Imprime una vez que el número asignado ya se reflejó en el documento.
  useEffect(() => {
    if (imprimirPend && remision && remision.numero > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImprimirPend(false);
      window.print();
    }
  }, [imprimirPend, remision]);

  // Ctrl+P / Cmd+P con el overlay abierto: pasa por el flujo del botón para
  // asignar el REM N° antes de imprimir (si no, saldría "REM N° —").
  useEffect(() => {
    if (!remision) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (!asignandoNumero) imprimir();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remision, asignandoNumero]);

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
                      "Valor unitario",
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
                    const sel = seleccion.has(p.rowNumber);
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
                            onChange={() => toggleFila(p)}
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
                        <td className="border-b border-line-soft px-3 py-3 whitespace-nowrap">
                          {cop(p.precio)}
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
                const sel = seleccion.has(p.rowNumber);
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
                        onChange={() => toggleFila(p)}
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
                    <CampoCard label="Valor unitario">{cop(p.precio)}</CampoCard>
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
              <span className="font-bold">{seleccion.size}</span> ítem(s) de{" "}
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

      {/* Remisión: overlay dentro de la misma vista. Al imprimir, el CSS
          (.remision-print-area en globals.css) deja salir solo el documento. */}
      {remision && (
        <div
          onClick={() => setRemision(null)}
          className="fixed inset-0 z-50 overflow-auto bg-black/70 p-4 print:bg-white print:p-0"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-w-[820px]"
          >
            <div className="print:hidden">
              <div className="mb-1 flex items-center justify-between">
                <button
                  onClick={() => {
                    setRemision(null);
                    setErrorRemision(null);
                  }}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cerrar
                </button>
                <button
                  onClick={imprimir}
                  disabled={asignandoNumero}
                  className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
                >
                  {asignandoNumero
                    ? "Asignando N°..."
                    : "Imprimir / Guardar PDF"}
                </button>
              </div>
              {remision.numero === 0 && !errorRemision && (
                <p className="mb-2 text-center text-xs text-neutral-300">
                  El número de remisión (REM N°) se asigna al imprimir.
                  {numeroPrevioOtros > 0 && (
                    <>
                      {" "}
                      Hoy ya se asignó el REM N°{" "}
                      {String(numeroPrevioOtros).padStart(4, "0")} a este
                      cliente con otros pedidos; esta remisión consumirá un
                      número nuevo.{" "}
                      <button
                        onClick={usarNumeroPrevio}
                        className="font-semibold underline"
                      >
                        ¿Reemplaza la anterior? Usar ese mismo N°
                      </button>
                    </>
                  )}
                </p>
              )}
              {remision.numero > 0 && numeroReutilizado && !errorRemision && (
                <p className="mb-2 text-center text-xs text-neutral-300">
                  Se reutilizó el REM N°{" "}
                  {String(remision.numero).padStart(4, "0")} asignado hoy a este
                  cliente porque comparte pedidos con esa remisión (no gasta
                  otro consecutivo).{" "}
                  <button
                    onClick={usarNumeroNuevo}
                    disabled={asignandoNumero}
                    className="font-semibold underline disabled:opacity-60"
                  >
                    ¿Es otro despacho? Usar N° nuevo
                  </button>
                </p>
              )}
              {errorRemision && (
                <div className="mb-2 rounded-lg border border-red-400 bg-red-500/20 px-3 py-2 text-center text-sm text-red-200">
                  {errorRemision}
                </div>
              )}
            </div>
            <div className="remision-print-area">
              {/* Si imprimen por el menú del navegador SIN número asignado,
                  sale este aviso en vez de una remisión con "REM N° —". */}
              {remision.numero === 0 && (
                <div className="hidden p-10 text-center text-lg font-bold text-black print:block">
                  Use el botón &quot;Imprimir / Guardar PDF&quot; de la app para
                  asignar el número de remisión (REM N°) antes de imprimir.
                </div>
              )}
              <div className={remision.numero === 0 ? "print:hidden" : ""}>
                <RemisionDoc rem={remision} />
              </div>
            </div>
          </div>
        </div>
      )}

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
