import type { Remision } from "@/lib/remision";

/** Datos fijos de la empresa (encabezado de la remisión). */
const EMPRESA = {
  nombre: "BLACK&RED UNDERWEAR S.A.S",
  nit: "901510667-9",
  direccion: "CLL 47#52-17 INT 102",
  telefono: "3016868368",
  correo: "BLACKREDUNDERWEAR@GMAIL.COM",
};

/** Filas de la tabla como en la plantilla (se rellena con vacías hasta 11). */
const MIN_FILAS = 11;

const cop = (n: number) =>
  "$ " + new Intl.NumberFormat("es-CO").format(Math.round(n));

/** Documento de la remisión, listo para imprimir. Solo presentación.
 *  Maquetado según la plantilla REMISIONES.xlsx del cliente. */
export default function RemisionDoc({ rem }: { rem: Remision }) {
  const filasVacias = Math.max(0, MIN_FILAS - rem.items.length);

  return (
    <div className="mx-auto max-w-[820px] bg-white p-6 text-black shadow-lg print:max-w-none print:p-0 print:shadow-none">
      {/* Título + encabezado de empresa */}
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          <tr>
            <td
              colSpan={3}
              className="border border-black p-1 text-center text-base font-bold"
            >
              REMISIÓN DESPACHO
            </td>
          </tr>
          <tr>
            <td className="w-[110px] border border-black p-1 text-center align-middle">
              {/* Logo real (extraído de la plantilla del cliente). next/image no
                  aplica: es un documento de impresión, sin optimización remota. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/remision-logo.png"
                alt="Black & Red"
                className="mx-auto w-full max-w-[100px]"
              />
            </td>
            <td className="border border-black p-1 text-center">
              <div className="font-semibold">{EMPRESA.nombre}</div>
              <div>{EMPRESA.nit}</div>
              <div>{EMPRESA.direccion}</div>
              <div>{EMPRESA.telefono}</div>
              <div className="font-semibold underline">{EMPRESA.correo}</div>
            </td>
            <td className="w-[150px] border border-black p-2 text-center align-middle">
              <div className="text-lg font-bold">
                REM N°{" "}
                {rem.numero > 0 ? String(rem.numero).padStart(4, "0") : "—"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Datos del cliente */}
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          <tr>
            <td className="w-[110px] border border-black bg-neutral-100 px-2 py-1 font-bold">
              FECHA:
            </td>
            <td className="border border-black px-2 py-1" colSpan={3}>
              {rem.fecha}
            </td>
          </tr>
          <tr>
            <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
              NOMBRE:
            </td>
            <td className="border border-black px-2 py-1" colSpan={3}>
              {rem.cliente.nombre}
            </td>
          </tr>
          <tr>
            <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
              DIRECCIÓN:
            </td>
            <td className="border border-black px-2 py-1">
              {rem.cliente.direccion}
            </td>
            <td className="w-[95px] border border-black bg-neutral-100 px-2 py-1 font-bold">
              CIUDAD:
            </td>
            <td className="w-[150px] border border-black px-2 py-1">
              {rem.cliente.ciudad}
            </td>
          </tr>
          <tr>
            <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
              TELÉFONO:
            </td>
            <td className="border border-black px-2 py-1">
              {rem.cliente.telefono}
            </td>
            <td className="border border-black bg-neutral-100 px-2 py-1 font-bold">
              VENDEDOR:
            </td>
            <td className="border border-black px-2 py-1">{rem.vendedor}</td>
          </tr>
        </tbody>
      </table>

      {/* Tabla de productos */}
      <table className="mt-2 w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-neutral-100 text-center font-bold">
            <th className="w-[95px] border border-black px-2 py-1">REF.</th>
            <th className="w-[75px] border border-black px-2 py-1">CANTIDAD</th>
            <th className="border border-black px-2 py-1">DESCRIPCIÓN</th>
            <th className="w-[105px] border border-black px-2 py-1">
              VALOR UNI.
            </th>
            <th className="w-[130px] border border-black px-2 py-1">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rem.items.map((it, i) => (
            <tr key={i}>
              <td className="border border-black px-2 py-1 text-center">
                {it.ref}
              </td>
              <td className="border border-black px-2 py-1 text-center">
                {it.cantidad}
              </td>
              <td className="border border-black px-2 py-1">{it.descripcion}</td>
              <td className="border border-black px-2 py-1 text-right">
                {cop(it.valorUni)}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {cop(it.total)}
              </td>
            </tr>
          ))}
          {Array.from({ length: filasVacias }).map((_, i) => (
            <tr key={`v${i}`}>
              <td className="border border-black px-2 py-1">&nbsp;</td>
              <td className="border border-black px-2 py-1"></td>
              <td className="border border-black px-2 py-1"></td>
              <td className="border border-black px-2 py-1"></td>
              <td className="border border-black px-2 py-1"></td>
            </tr>
          ))}
          {/* Fila del gran total: como en la plantilla, solo las dos últimas
              celdas llevan borde. */}
          <tr className="font-bold">
            <td colSpan={3} className="px-2 py-1"></td>
            <td className="border border-black bg-neutral-100 px-2 py-1 text-center">
              TOTAL
            </td>
            <td className="border border-black px-2 py-1 text-right">
              {cop(rem.granTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
