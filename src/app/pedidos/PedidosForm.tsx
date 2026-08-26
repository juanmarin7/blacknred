"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Combobox from "@/components/Combobox";
import LoadingOverlay from "@/components/LoadingOverlay";
import PantallaCarga from "@/components/PantallaCarga";
import Modal from "@/components/Modal";
import { LOGO_FOOTER_URL } from "@/lib/branding";
import { esCantidadTallas } from "@/lib/tallas";
import type { InitialData, Producto } from "@/lib/types";

interface Item {
  producto: Producto;
  empaque: string;
  color: string;
  cantidad: string | number;
  descripcion: string;
  precioFinal: number;
}

interface Resumen {
  codigo: number;
  fecha: string;
  clienteTexto: string;
  vendedorTexto: string;
  items: Item[];
}

const COP = (n: number) =>
  n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

export default function PedidosForm() {
  const [data, setData] = useState<InitialData | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [idCliente, setIdCliente] = useState("");
  const [idProducto, setIdProducto] = useState("");
  const [empaqueSel, setEmpaqueSel] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tallas, setTallas] = useState<Record<string, string>>({});
  const [color, setColor] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [alerta, setAlerta] = useState<{
    tipo: "ok" | "error";
    msg: string;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    fetch("/api/initial-data")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error || `Error ${r.status}`);
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setErrorCarga(e.message));
  }, []);

  /* ─── Derivados del producto seleccionado (port de actualizarEmpaques) ─── */

  const prod = useMemo(
    () => data?.productos.find((p) => p.id === idProducto) ?? null,
    [data, idProducto],
  );

  const esTallas = Boolean(prod && data?.productosConTallas.includes(prod.id));
  const config = (prod && data?.tallasPorProducto[prod.id]) || [];

  const especiales = config.filter((v) => {
    const u = (v || "").trim().toUpperCase();
    return u === "SURTIDO" || u === "BURBUJA" || u === "DUOS" || u === "TRIOS";
  });
  const tallasORangos = config.filter((v) => {
    const u = (v || "").trim().toUpperCase();
    return u !== "SURTIDO" && u !== "BURBUJA" && u !== "DUOS" && u !== "TRIOS";
  });

  const empaquesNormales = useMemo(() => {
    if (!prod || !data) return [];
    return data.tiposEmpaque.filter((e) => prod.empaques.includes(e.id));
  }, [prod, data]);

  // Qué se muestra: select de empaque / cantidad / grilla de tallas
  let mostrarEmpaque = false;
  let mostrarCantidad = false;
  let mostrarTallas = false;

  if (prod) {
    if (esTallas && especiales.length > 0) {
      mostrarEmpaque = true;
      const sel = empaqueSel.trim().toUpperCase();
      if (sel === "SURTIDO") {
        mostrarCantidad = true;
      } else {
        // '' (DOCENAS POR TALLA), BURBUJA, DUOS o TRIOS → grilla de tallas
        mostrarTallas = tallasORangos.length > 0;
        if (
          !mostrarTallas &&
          sel !== "BURBUJA" &&
          sel !== "DUOS" &&
          sel !== "TRIOS"
        )
          mostrarCantidad = true;
      }
    } else if (esTallas) {
      mostrarTallas = tallasORangos.length > 0;
      mostrarCantidad = !mostrarTallas;
    } else {
      mostrarEmpaque = true;
      mostrarCantidad = true;
    }
  }

  function resetProductoForm() {
    setIdProducto("");
    setEmpaqueSel("");
    setCantidad("");
    setTallas({});
    setColor("");
    setDescripcion("");
  }

  function onProductoChange(id: string) {
    setIdProducto(id);
    setEmpaqueSel("");
    setCantidad("");
    setTallas({});
    setDescripcion("");
    const nuevo = data?.productos.find((p) => p.id === id);
    const colores = nuevo?.color
      ? nuevo.color.split(",").map((c) => c.trim())
      : [];
    setColor(colores[0] ?? "");
  }

  function mostrarAlerta(msg: string, tipo: "ok" | "error" = "ok") {
    setAlerta({ tipo, msg });
    setTimeout(() => setAlerta(null), 4000);
  }

  /* ─── Agregar producto (port del onclick original) ─── */

  function agregarProducto() {
    if (!data || !prod) {
      mostrarAlerta("Seleccione un producto valido", "error");
      return;
    }
    if (!idCliente) {
      mostrarAlerta(
        "Debe seleccionar cliente antes de agregar productos.",
        "error",
      );
      return;
    }

    let cantidadFinal: string | number;
    let empaqueFinal: string;

    const tipoEmpaque = empaqueSel.trim().toUpperCase();

    const leerTallas = (): string | null => {
      const obj: Record<string, number> = {};
      tallasORangos.forEach((t) => {
        const val = parseInt(tallas[t] || "0", 10) || 0;
        if (val > 0) obj[t] = val;
      });
      if (Object.keys(obj).length === 0) return null;
      return Object.entries(obj)
        .map(([t, c]) => `${t} : ${c}`)
        .join("  |  ");
    };

    if (esTallas) {
      if (!tipoEmpaque || (!mostrarEmpaque && mostrarTallas)) {
        const str = leerTallas();
        if (!str) {
          mostrarAlerta(
            "Debe ingresar al menos una cantidad en los rangos/tallas.",
            "error",
          );
          return;
        }
        cantidadFinal = str;
        empaqueFinal = "Tallas";
      } else if (tipoEmpaque === "SURTIDO") {
        const cant = parseInt(cantidad, 10) || 0;
        if (cant <= 0) {
          mostrarAlerta("La cantidad debe ser mayor a 0.", "error");
          return;
        }
        cantidadFinal = cant;
        empaqueFinal = "Surtido";
      } else if (tipoEmpaque === "BURBUJA") {
        const str = leerTallas();
        if (!str) {
          mostrarAlerta("Debe ingresar al menos una talla.", "error");
          return;
        }
        cantidadFinal = str;
        empaqueFinal = "BURBUJA";
      } else if (tipoEmpaque === "DUOS" || tipoEmpaque === "TRIOS") {
        const str = leerTallas();
        if (!str) {
          mostrarAlerta("Debe ingresar al menos una talla.", "error");
          return;
        }
        cantidadFinal = str;
        // "Duos" / "Trios" (mismo formato que el AppScript)
        empaqueFinal =
          tipoEmpaque.charAt(0) + tipoEmpaque.slice(1).toLowerCase();
      } else {
        mostrarAlerta("Seleccione un tipo de empaque valido.", "error");
        return;
      }
    } else {
      const emp = empaquesNormales.find((e) => String(e.id) === empaqueSel);
      if (!emp) {
        mostrarAlerta("Debe seleccionar un tipo de empaque.", "error");
        return;
      }
      const cant = parseInt(cantidad, 10) || 0;
      if (cant <= 0) {
        mostrarAlerta("La cantidad debe ser mayor a 0.", "error");
        return;
      }
      cantidadFinal = cant;
      empaqueFinal = emp.nombre;
    }

    setItems((prev) => [
      ...prev,
      {
        producto: prod,
        empaque: empaqueFinal,
        color: prod.color ? color : "",
        cantidad: cantidadFinal,
        descripcion,
        // Pedido del cliente: el precio NO se trae de la hoja de productos;
        // el vendedor lo escribe (0 = sin diligenciar, el input se ve vacío).
        precioFinal: 0,
      },
    ]);
    resetProductoForm();
  }

  /* ─── Guardar pedido ─── */

  async function guardarPedido() {
    if (!items.length) {
      mostrarAlerta("Debe agregar al menos un producto.", "error");
      return;
    }

    // El precio ya no se autollena: exigirlo evita guardar pedidos en $0
    // (afectaría el total, el mensaje de WhatsApp y la remisión).
    const sinPrecio = items.find((i) => !(i.precioFinal > 0));
    if (sinPrecio) {
      mostrarAlerta(
        `Escriba el precio de "${sinPrecio.producto.nombre}".`,
        "error",
      );
      return;
    }

    const order = {
      idClienteLocal: idCliente,
      items: items.map((i) => ({
        idProducto: i.producto.id,
        cantidad: i.cantidad,
        empaque: i.empaque,
        descripcion: i.descripcion || "",
        color: i.color || "",
        precioFinal: i.precioFinal || 0,
      })),
    };

    setGuardando(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Error al guardar");

      const fecha = new Date().toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const cliente = data!.clientes.find((c) => c.id === idCliente);

      setResumen({
        codigo: body.codigo,
        fecha,
        clienteTexto: cliente ? `${cliente.nombre} - ${cliente.local}` : "",
        vendedorTexto: (body.vendedor as string | undefined) ?? "",
        items,
      });
      setItems([]);
      resetProductoForm();
    } catch (e) {
      mostrarAlerta(
        "Error al guardar el pedido: " +
          (e instanceof Error ? e.message : ""),
        "error",
      );
    } finally {
      setGuardando(false);
    }
  }

  /* ─── Resumen / WhatsApp ─── */

  function lineasResumen(r: Resumen) {
    let granTotal = 0;
    const filas = r.items.map((item) => {
      const esT = esCantidadTallas(String(item.cantidad));
      const cantidadTotal = esT
        ? String(item.cantidad)
            .split("|")
            .reduce((acc, p) => acc + (parseInt(p.split(":")[1], 10) || 0), 0)
        : Number(item.cantidad) || 0;
      const subtotal = cantidadTotal * item.precioFinal;
      granTotal += subtotal;
      // Empaques DUOS/TRIOS muestran su propia unidad (duos/trios); el resto
      // sigue en docenas ("doc") o unidades ("und") según el producto.
      const emp = (item.empaque || "").trim().toLowerCase();
      const unidad =
        emp === "duos" || emp === "trios"
          ? emp
          : item.producto.unidadDocena === "Unidad"
            ? "und"
            : "doc";
      return { item, esT, cantidadTotal, subtotal, unidad };
    });
    return { filas, granTotal };
  }

  function textoWhatsapp(r: Resumen) {
    const { filas, granTotal } = lineasResumen(r);
    const lineas = filas.map(({ item, esT, cantidadTotal, subtotal, unidad }) => {
      const cantidadWA = esT
        ? String(item.cantidad)
            .split("|")
            .map((p) => p.trim().replace(":", "→"))
            .join(", ")
        : `${item.cantidad}${item.empaque ? " " + item.empaque : ""}`;
      const colorWA = item.color ? " · " + item.color : "";
      return `- ${item.producto.nombre}${colorWA}: ${cantidadWA} (${cantidadTotal} ${unidad} x ${COP(item.precioFinal)} = ${COP(subtotal)})`;
    });

    return (
      `*Pedido #${r.codigo}*\n` +
      `Fecha: ${r.fecha}\n` +
      `Cliente: ${r.clienteTexto}\n` +
      `Vendedor: ${r.vendedorTexto}\n\n` +
      `*Productos:*\n${lineas.join("\n")}\n\n` +
      `*Total: ${COP(granTotal)}*`
    );
  }

  function compartirWhatsapp() {
    if (!resumen) return;
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(textoWhatsapp(resumen)),
      "_blank",
    );
  }

  /* ─── Render ─── */

  if (errorCarga) {
    return (
      <>
        <AppHeader titulo="Registro de pedidos" />
        <div className="mx-auto mt-10 max-w-[720px] rounded-lg bg-[#7b1e1e] p-4 text-center">
          {errorCarga}
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppHeader titulo="Registro de pedidos" />
        <PantallaCarga />
      </>
    );
  }

  const inputCls =
    "mt-1.5 w-full rounded-md border border-line bg-black px-3 py-2.5 text-base text-white focus:border-accent focus:outline-none";
  const labelCls = "mt-3 block text-sm font-bold";

  const coloresProducto = prod?.color
    ? prod.color.split(",").map((c) => c.trim())
    : [];

  return (
    <div className="min-h-screen">
      <AppHeader titulo="Registro de pedidos" />

      <div className="mx-auto w-full max-w-[720px] px-4 py-4 md:max-w-[800px]">
        {/* Datos del pedido */}
        <section className="mb-4 rounded-[10px] border border-line bg-surface p-4 md:p-5">
          <h3 className="text-base font-bold text-white md:text-lg">Datos del pedido</h3>

          <label className={labelCls}>Cliente / Local</label>
          <Combobox
            opciones={data.clientes.map((c) => ({
              id: c.id,
              label: `${c.nombre} - ${c.local}`,
            }))}
            valor={idCliente}
            onChange={setIdCliente}
            placeholder="Buscar cliente o local..."
          />
        </section>

        {/* Agregar producto */}
        <section className="mb-4 rounded-[10px] border border-line bg-surface p-4 md:p-5">
          <h3 className="text-base font-bold text-white md:text-lg">Agregar producto</h3>

          <label className={labelCls}>Producto</label>
          <select
            value={idProducto}
            onChange={(e) => onProductoChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Seleccione una opcion...</option>
            {data.productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          {mostrarEmpaque && (
            <>
              <label className={labelCls}>Tipo de empaque</label>
              <select
                value={empaqueSel}
                onChange={(e) => setEmpaqueSel(e.target.value)}
                className={inputCls}
              >
                {esTallas ? (
                  <>
                    <option value="">DOCENAS POR TALLA</option>
                    {especiales.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="">Seleccione una opcion...</option>
                    {empaquesNormales.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </>
          )}

          {prod && coloresProducto.length > 0 && (
            <>
              <label className={labelCls}>Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputCls}
              >
                {coloresProducto.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </>
          )}

          {mostrarCantidad && (
            <>
              <label className={labelCls}>Cantidad</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={inputCls}
              />
            </>
          )}

          {mostrarTallas && (
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {tallasORangos.map((t) => (
                <div key={t}>
                  <label className="block text-xs font-bold">{t}</label>
                  <input
                    type="number"
                    min={0}
                    value={tallas[t] ?? ""}
                    onChange={(e) =>
                      setTallas((prev) => ({ ...prev, [t]: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-line bg-black px-2.5 py-2 text-base text-white focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {prod && (
            <>
              <label className={labelCls}>Descripcion</label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={inputCls}
              />
            </>
          )}

          <button
            type="button"
            onClick={agregarProducto}
            className="mt-4 w-full rounded-md bg-ok px-4 py-3 text-base font-bold text-white transition-opacity active:scale-[0.98] active:opacity-85"
          >
            + Agregar producto
          </button>
        </section>

        {/* Lista de items */}
        <section className="mb-4 rounded-[10px] border border-line bg-surface p-4 md:p-5">
          <h3 className="text-base font-bold text-white md:text-lg">
            Productos del pedido
          </h3>
          <ul className="mt-2">
            {items.map((i, idx) => {
              const texto = esCantidadTallas(String(i.cantidad))
                ? `${i.producto.nombre} - Tallas: ${i.cantidad}`
                : `${i.producto.nombre} - ${i.empaque} - ${i.cantidad}${i.color ? " - " + i.color : ""}`;
              return (
                <li
                  key={idx}
                  className="mb-2 rounded-md border border-line bg-surface-2 p-2.5 text-sm break-words"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <span>{texto}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, j) => j !== idx))
                      }
                      className="shrink-0 rounded bg-[#e53935] px-2 py-1 text-white"
                    >
                      X
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs whitespace-nowrap text-muted-2">
                      Precio:
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Escriba el precio"
                      value={i.precioFinal === 0 ? "" : i.precioFinal}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, j) =>
                            j === idx
                              ? { ...it, precioFinal: Number(e.target.value) || 0 }
                              : it,
                          ),
                        )
                      }
                      className="flex-1 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-sm text-white focus:border-accent focus:outline-none"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <button
          type="button"
          onClick={guardarPedido}
          className="w-full rounded-md bg-accent px-4 py-3.5 text-lg font-bold text-white transition-opacity active:scale-[0.98] active:opacity-85"
        >
          Guardar pedido
        </button>

        {alerta && (
          <div
            className={`mt-4 rounded-md p-3 text-center text-sm ${
              alerta.tipo === "ok" ? "bg-ok" : "bg-wine"
            }`}
          >
            {alerta.msg}
          </div>
        )}

        <footer className="flex justify-center py-5 opacity-85">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_FOOTER_URL}
            alt="Black & Red"
            className="h-10 object-contain"
          />
        </footer>
      </div>

      <LoadingOverlay visible={guardando} texto="Guardando pedido..." />

      {/* Modal resumen */}
      <Modal abierto={Boolean(resumen)} onCerrar={() => setResumen(null)}>
        {resumen && (
          <>
            <h2 className="text-xl font-bold tracking-wide uppercase">
              ✅ Pedido guardado
            </h2>
            <div className="mt-3 text-[28px] font-bold text-accent">
              Código #{resumen.codigo}
            </div>
            <div className="mb-4 text-[13px] text-muted-2">{resumen.fecha}</div>

            <div className="mb-3.5 rounded-lg border border-line bg-surface-2 px-4 py-3 text-left text-sm leading-7 text-[#ccc]">
              <strong className="text-white">Cliente:</strong>{" "}
              {resumen.clienteTexto}
              <br />
              <strong className="text-white">Vendedor:</strong>{" "}
              {resumen.vendedorTexto}
            </div>

            <div className="mb-5 text-left">
              {(() => {
                const { filas, granTotal } = lineasResumen(resumen);
                return (
                  <>
                    {filas.map(
                      ({ item, esT, cantidadTotal, subtotal, unidad }, i) => (
                        <div
                          key={i}
                          className="mb-2.5 rounded-lg border border-line bg-surface-2 px-3.5 py-3"
                        >
                          <div className="mb-1.5 text-[15px] font-bold text-white">
                            {item.producto.nombre}
                            {item.color ? (
                              <span className="text-[13px] text-muted-2">
                                {" "}
                                · {item.color}
                              </span>
                            ) : null}
                          </div>
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {esT ? (
                              String(item.cantidad)
                                .split("|")
                                .map((p, j) => {
                                  const [t, c] = p.split(":");
                                  return (
                                    <span
                                      key={j}
                                      className="inline-block rounded-[5px] border border-accent/20 bg-accent/10 px-2 py-0.5 text-[13px]"
                                    >
                                      <span className="font-bold text-accent">
                                        {t?.trim()}
                                      </span>
                                      : {c?.trim()}
                                    </span>
                                  );
                                })
                            ) : (
                              <span>
                                <span className="font-bold text-white">
                                  {item.cantidad}
                                </span>
                                {item.empaque ? (
                                  <span className="text-muted-2">
                                    {" "}
                                    · {item.empaque}
                                  </span>
                                ) : null}
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] text-muted">
                            {cantidadTotal} {unidad} × {COP(item.precioFinal)} ={" "}
                            <span className="font-bold text-white">
                              {COP(subtotal)}
                            </span>
                          </div>
                          {item.descripcion ? (
                            <div className="mt-1.5 text-xs text-[#555]">
                              {item.descripcion}
                            </div>
                          ) : null}
                        </div>
                      ),
                    )}
                    <div className="mt-1 border-t border-line-strong pt-3.5 text-right">
                      <span className="text-sm text-muted">Total pedido:</span>
                      <span className="ml-2.5 text-[22px] font-bold text-accent">
                        {COP(granTotal)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              onClick={compartirWhatsapp}
              className="mb-2.5 w-full rounded-lg bg-wa px-5 py-3 text-base font-bold tracking-wide text-white"
            >
              📲 Compartir por WhatsApp
            </button>
            <button
              onClick={() => setResumen(null)}
              className="w-full rounded-lg border border-line-strong px-5 py-3 text-[15px] font-semibold text-muted"
            >
              Cerrar
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
