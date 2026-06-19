"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import EstadoBadge from "@/components/EstadoBadge";
import LoadingOverlay from "@/components/LoadingOverlay";
import PantallaCarga from "@/components/PantallaCarga";
import Modal from "@/components/Modal";
import TallaBadges from "@/components/TallaBadges";
import { esCantidadTallas, parseTallas } from "@/lib/tallas";
import { usePedidos } from "@/lib/usePedidos";
import type { PedidoRow } from "@/lib/types";

type ModoModal = "menu" | "parcial" | "total";

export default function DespachoView() {
  const { pedidos, error, ultimaActualizacion, recargar } =
    usePedidos("despacho");

  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<PedidoRow | null>(null);
  const [modo, setModo] = useState<ModoModal>("menu");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [numero, setNumero] = useState("");
  const [paraEnviar, setParaEnviar] = useState<PedidoRow | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Filtro por codigo, producto o cliente (igual que la vista original)
  const termino = busqueda.trim().toLowerCase();
  const filtrados = (pedidos ?? [])
    .filter(
      (p) =>
        !termino ||
        String(p.codigo).toLowerCase().includes(termino) ||
        p.producto.toLowerCase().includes(termino) ||
        p.cliente.toLowerCase().includes(termino),
    )
    .sort((a, b) =>
      String(a.codigo).localeCompare(String(b.codigo), "es", {
        numeric: true,
      }),
    );

  function abrirModal(p: PedidoRow) {
    setSeleccionado(p);
    setModo("menu");
    setErrorModal(null);
  }

  function elegirModo(p: PedidoRow, m: Exclude<ModoModal, "menu">) {
    // Inputs precargados con las cantidades actuales (como el original):
    // por defecto se despacha/queda todo, el despachador ajusta hacia abajo.
    if (esCantidadTallas(p.cantidad)) {
      const obj = parseTallas(p.cantidad);
      const iniciales: Record<string, string> = {};
      Object.keys(obj).forEach((t) => (iniciales[t] = String(obj[t])));
      setValores(iniciales);
    } else {
      setValores({});
      setNumero(m === "total" ? String(p.cantidad) : "");
    }
    setErrorModal(null);
    setModo(m);
  }

  function cerrarModal() {
    setSeleccionado(null);
    setErrorModal(null);
  }

  async function post(url: string, body: unknown): Promise<boolean> {
    setProcesando(true);
    setErrorModal(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
      return true;
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : "Error");
      return false;
    } finally {
      setProcesando(false);
    }
  }

  function cantidadDesdeInputs(p: PedidoRow): string | number | null {
    if (esCantidadTallas(p.cantidad)) {
      // Mismo formato que el original: todas las tallas, "S:2 | M:0"
      const tallas = Object.keys(parseTallas(p.cantidad));
      const partes = tallas.map((t) => `${t}:${parseInt(valores[t] || "0", 10) || 0}`);
      const algunaPositiva = tallas.some(
        (t) => (parseInt(valores[t] || "0", 10) || 0) > 0,
      );
      if (!algunaPositiva) return null;
      return partes.join(" | ");
    }
    const n = parseInt(numero, 10);
    if (Number.isNaN(n) || n <= 0) return null;
    return n;
  }

  async function confirmar() {
    if (!seleccionado || modo === "menu") return;
    const cantidad = cantidadDesdeInputs(seleccionado);
    if (cantidad === null) {
      setErrorModal("Ingrese al menos una cantidad válida.");
      return;
    }
    const url =
      modo === "parcial" ? "/api/pedidos/parcial" : "/api/pedidos/total";
    const ok = await post(url, { row: seleccionado.rowNumber, cantidad });
    if (ok) {
      cerrarModal();
      recargar();
    }
  }

  async function confirmarEnviar() {
    if (!paraEnviar) return;
    const ok = await post("/api/pedidos/estado", {
      row: paraEnviar.rowNumber,
      estado: "Enviado",
    });
    if (ok) {
      setParaEnviar(null);
      recargar();
    }
  }

  const inputCls =
    "mt-2 w-full rounded-lg border border-line-strong bg-surface-2 px-4 py-3 text-xl text-white focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,59,59,0.15)] focus:outline-none";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        titulo="Vista Despachador"
        subtitulo={
          ultimaActualizacion
            ? `Ultima actualizacion: ${ultimaActualizacion.toLocaleTimeString()}`
            : "Cargando..."
        }
      />

      <div className="px-4 pt-3 md:px-10">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por codigo, producto o cliente."
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
            {termino
              ? `No hay pedidos para "${busqueda.trim()}"`
              : "No hay pedidos en estado Pendiente"}
          </div>
        ) : (
          <>
            {/* Tabla escritorio/tablet horizontal */}
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
                      "Estado",
                      "Descripción",
                      "M",
                      "Enviar",
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
                      className="odd:bg-surface-2 even:bg-[#232222] hover:[&>td]:bg-line-soft"
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
                      <td className="border-b border-line-soft px-3 py-3 text-center">
                        <EstadoBadge estado={p.estado} />
                      </td>
                      <td className="border-b border-line-soft px-3 py-3">
                        {p.descripcion}
                      </td>
                      <td className="border-b border-line-soft px-2 py-3 text-center">
                        <button
                          onClick={() => abrirModal(p)}
                          className="rounded-lg bg-accent px-4 py-2 font-bold text-white uppercase shadow-[0_2px_8px_rgba(255,59,59,0.3)] transition-all hover:-translate-y-px hover:bg-[#e62e2e]"
                        >
                          M
                        </button>
                      </td>
                      <td className="border-b border-line-soft px-2 py-3 text-center">
                        <button
                          onClick={() => setParaEnviar(p)}
                          className="rounded-lg bg-send px-3 py-2 font-bold text-white uppercase shadow-[0_2px_8px_rgba(43,139,196,0.3)] transition-all hover:-translate-y-px"
                        >
                          Enviar
                        </button>
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
                  <div className="border-b-2 border-wine pb-2 text-lg font-semibold text-white">
                    #{p.codigo} — {p.producto}
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
                  <CampoCard label="Estado">
                    <EstadoBadge estado={p.estado} />
                  </CampoCard>
                  {p.descripcion && (
                    <CampoCard label="Descripción">{p.descripcion}</CampoCard>
                  )}
                  <div className="mt-3.5 flex gap-2.5">
                    <button
                      onClick={() => abrirModal(p)}
                      className="flex-1 rounded-[10px] bg-accent py-3 text-base font-bold text-white uppercase"
                    >
                      Modificar
                    </button>
                    <button
                      onClick={() => setParaEnviar(p)}
                      className="flex-1 rounded-[10px] bg-send py-3 text-base font-bold text-white uppercase"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal modificar */}
      <Modal abierto={Boolean(seleccionado)} onCerrar={cerrarModal}>
        {seleccionado && (
          <>
            <h2 className="mb-5 text-2xl font-bold tracking-wide uppercase">
              Modificar pedido
            </h2>

            {modo === "menu" && (
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => elegirModo(seleccionado, "parcial")}
                  className="rounded-lg bg-wine px-7 py-3 text-lg font-semibold text-white transition-colors hover:bg-wine-hover"
                >
                  Modificar parcial
                </button>
                <button
                  onClick={() => elegirModo(seleccionado, "total")}
                  className="rounded-lg bg-wine px-7 py-3 text-lg font-semibold text-white transition-colors hover:bg-wine-hover"
                >
                  Modificar total
                </button>
                <button
                  onClick={cerrarModal}
                  className="rounded-lg border border-line-strong px-7 py-3 text-base font-semibold text-muted"
                >
                  Cerrar
                </button>
              </div>
            )}

            {modo !== "menu" && (
              <div className="text-left">
                <p className="mb-3 text-base text-[#999]">
                  {modo === "parcial"
                    ? esCantidadTallas(seleccionado.cantidad)
                      ? "Cantidades a despachar (el restante queda como pedido nuevo):"
                      : "Cantidad a despachar (el restante queda como pedido nuevo):"
                    : esCantidadTallas(seleccionado.cantidad)
                      ? "Cantidades finales:"
                      : "Cantidad a modificar:"}
                </p>

                {esCantidadTallas(seleccionado.cantidad) ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(parseTallas(seleccionado.cantidad)).map(
                      (t) => (
                        <div key={t}>
                          <label className="text-lg font-semibold text-accent">
                            {t}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={valores[t] ?? ""}
                            onChange={(e) =>
                              setValores((prev) => ({
                                ...prev,
                                [t]: e.target.value,
                              }))
                            }
                            className={inputCls}
                          />
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className={inputCls}
                    placeholder="Cantidad"
                  />
                )}

                {errorModal && (
                  <div className="mt-3 rounded-lg border border-wine bg-wine/30 px-3 py-2 text-center text-sm text-[#ff6b6b]">
                    {errorModal}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    onClick={confirmar}
                    className="w-full rounded-lg bg-wine px-7 py-3 text-lg font-semibold text-white transition-colors hover:bg-wine-hover"
                  >
                    {modo === "parcial" ? "Crear pedido" : "Modificar pedido"}
                  </button>
                  <button
                    onClick={() => setModo("menu")}
                    className="w-full rounded-lg border border-line-strong px-7 py-3 text-base font-semibold text-muted"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Modal enviar */}
      <Modal abierto={Boolean(paraEnviar)} onCerrar={() => setParaEnviar(null)}>
        {paraEnviar && (
          <>
            <h2 className="mb-4 text-2xl font-bold tracking-wide uppercase">
              Confirmar envio
            </h2>
            <p className="text-base leading-relaxed text-[#999]">
              Asegurese de tener el pedido listo antes de enviar
            </p>
            <p className="mt-2 text-sm text-muted">
              Pedido <strong className="text-white">#{paraEnviar.codigo}</strong>{" "}
              — {paraEnviar.producto} ({paraEnviar.cliente})
            </p>
            {errorModal && (
              <div className="mt-3 rounded-lg border border-wine bg-wine/30 px-3 py-2 text-center text-sm text-[#ff6b6b]">
                {errorModal}
              </div>
            )}
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={confirmarEnviar}
                className="rounded-lg bg-ok px-7 py-3 text-lg font-semibold text-white shadow-[0_2px_8px_rgba(30,155,60,0.35)] transition-colors hover:bg-ok-hover"
              >
                Enviar
              </button>
              <button
                onClick={() => setParaEnviar(null)}
                className="rounded-lg border border-line-strong px-7 py-3 text-base font-semibold text-muted"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Modal>

      <LoadingOverlay visible={procesando} texto="Procesando..." />
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
