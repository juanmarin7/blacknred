import { readFileSync } from "fs";
import path from "path";
import ExcelJS from "exceljs";
import type { Remision } from "./remision";

/**
 * Genera el .xlsx de una remisión calcando el documento imprimible
 * (`RemisionDoc` / plantilla `REMISIONES.xlsx` del cliente): título a todo el
 * ancho, encabezado logo | empresa | REM N°, bloque de cliente, tabla de
 * productos (rellena con filas vacías hasta un mínimo) y fila de gran total.
 * Se usa tanto para la remisión original (M2) como para la modificada (M3),
 * ya que ambas comparten la forma `Remision`.
 */

const EMPRESA = {
  nombre: "BLACK&RED UNDERWEAR S.A.S",
  nit: "901510667-9",
  direccion: "CLL 47#52-17 INT 102",
  telefono: "3016868368",
  correo: "BLACKREDUNDERWEAR@GMAIL.COM",
};

/** Filas mínimas de la tabla (igual que la plantilla): se rellena con vacías. */
const MIN_FILAS = 11;

/** Formato COP: "$ 71.000" (separador de miles según locale del que abre). */
const FMT_COP = '"$ "#,##0';
/** Gris de los encabezados/etiquetas (≈ Tailwind neutral-100). */
const GRIS = "FFF5F5F5";

function bordeFino(): Partial<ExcelJS.Borders> {
  const b = { style: "thin" as const, color: { argb: "FF000000" } };
  return { top: b, left: b, bottom: b, right: b };
}

export async function construirExcelRemision(rem: Remision): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Black & Red";
  const ws = wb.addWorksheet("Remisión", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  // Anchos de columna calcados de la plantilla REMISIONES.xlsx.
  ws.columns = [
    { width: 14.43 }, // A REF.
    { width: 10.71 }, // B CANTIDAD
    { width: 45.14 }, // C DESCRIPCIÓN
    { width: 15.14 }, // D VALOR UNI.
    { width: 20.86 }, // E TOTAL
  ];

  const numeroTxt = rem.numero > 0 ? String(rem.numero).padStart(4, "0") : "—";

  /** Escribe una etiqueta gris en negrita (columna A del bloque cliente). */
  const etiqueta = (celda: string, texto: string) => {
    const c = ws.getCell(celda);
    c.value = texto;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    c.border = bordeFino();
  };
  /** Borde fino a cada celda de un rango "A1:E1" (columnas de una letra). */
  const bordear = (rango: string) => {
    const [c1, c2] = rango.split(":");
    const col1 = c1.charCodeAt(0) - 64;
    const col2 = c2.charCodeAt(0) - 64;
    const row1 = Number(c1.slice(1));
    const row2 = Number(c2.slice(1));
    for (let r = row1; r <= row2; r++)
      for (let col = col1; col <= col2; col++)
        ws.getRow(r).getCell(col).border = bordeFino();
  };

  // ── Título (fila 1, todo el ancho) ──
  ws.mergeCells("A1:E1");
  const titulo = ws.getCell("A1");
  titulo.value = "REMISIÓN DESPACHO";
  titulo.font = { bold: true, size: 16 };
  titulo.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 22;
  bordear("A1:E1");

  // ── Encabezado: logo (A) | empresa (B:D) | REM N° (E) ── filas 2..6
  ws.mergeCells("A2:A6"); // logo
  ws.mergeCells("B2:D2");
  ws.getCell("B2").value = EMPRESA.nombre;
  ws.mergeCells("B3:D3");
  ws.getCell("B3").value = EMPRESA.nit;
  ws.mergeCells("B4:D4");
  ws.getCell("B4").value = EMPRESA.direccion;
  ws.mergeCells("B5:D5");
  ws.getCell("B5").value = EMPRESA.telefono;
  ws.mergeCells("B6:D6");
  ws.getCell("B6").value = EMPRESA.correo;
  for (let r = 2; r <= 6; r++) {
    const c = ws.getCell(`B${r}`);
    c.font = { bold: true, size: 11, underline: r === 6 };
    c.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(r).height = 16;
  }
  ws.mergeCells("E2:E6"); // REM N°
  const remCell = ws.getCell("E2");
  remCell.value = `REM N° ${numeroTxt}`;
  remCell.font = { bold: true, size: 14 };
  remCell.alignment = { horizontal: "center", vertical: "middle" };
  bordear("A2:E6");

  // Logo embebido (calca el <img src="/remision-logo.png"> del navegador).
  try {
    const logoPath = path.join(process.cwd(), "public", "remision-logo.png");
    readFileSync(logoPath); // valida que exista antes de referenciarlo
    const imgId = wb.addImage({ filename: logoPath, extension: "png" });
    // Tamaño fijo conservando el ratio del logo (215x234 → ~0.92), centrado
    // dentro de la celda A2:A6 con un pequeño margen (como el navegador, que
    // usa w-full max-w-[100px] sin deformar).
    ws.addImage(imgId, {
      tl: { col: 0.1, row: 1.25 },
      ext: { width: 90, height: 98 },
      editAs: "oneCell",
    } as unknown as ExcelJS.ImageRange);
  } catch {
    // Sin logo (p. ej. entorno de test): la remisión sale igual, sin imagen.
  }

  // ── Datos del cliente (filas 7..10) ──
  etiqueta("A7", "FECHA:");
  ws.mergeCells("B7:E7");
  ws.getCell("B7").value = rem.fecha;

  etiqueta("A8", "NOMBRE:");
  ws.mergeCells("B8:E8");
  ws.getCell("B8").value = rem.cliente.nombre;

  etiqueta("A9", "DIRECCIÓN:");
  ws.mergeCells("B9:C9");
  ws.getCell("B9").value = rem.cliente.direccion;
  etiqueta("D9", "CIUDAD:");
  ws.getCell("E9").value = rem.cliente.ciudad;

  etiqueta("A10", "TELÉFONO:");
  ws.mergeCells("B10:C10");
  ws.getCell("B10").value = rem.cliente.telefono;
  etiqueta("D10", "VENDEDOR:");
  ws.getCell("E10").value = rem.vendedor;

  bordear("A7:E10");

  // ── Tabla de productos ──
  const FILA_ENC = 12; // fila 11 queda como separación (mt-2 del navegador)
  const encabezados = ["REF.", "CANTIDAD", "DESCRIPCIÓN", "VALOR UNI.", "TOTAL"];
  const filaEnc = ws.getRow(FILA_ENC);
  encabezados.forEach((txt, i) => {
    const c = filaEnc.getCell(i + 1);
    c.value = txt;
    c.font = { bold: true };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
    c.border = bordeFino();
  });

  const nFilas = Math.max(rem.items.length, MIN_FILAS);
  for (let i = 0; i < nFilas; i++) {
    const r = ws.getRow(FILA_ENC + 1 + i);
    const it = rem.items[i];
    if (it) {
      r.getCell(1).value = it.ref;
      r.getCell(1).alignment = { horizontal: "center" };
      r.getCell(2).value = it.cantidad;
      r.getCell(2).alignment = { horizontal: "center" };
      r.getCell(3).value = it.descripcion;
      r.getCell(4).value = it.valorUni;
      r.getCell(4).numFmt = FMT_COP;
      r.getCell(4).alignment = { horizontal: "right" };
      r.getCell(5).value = it.total;
      r.getCell(5).numFmt = FMT_COP;
      r.getCell(5).alignment = { horizontal: "right" };
    }
    for (let col = 1; col <= 5; col++) r.getCell(col).border = bordeFino();
  }

  // ── Fila de gran total (solo las dos últimas celdas con borde) ──
  const rTotal = ws.getRow(FILA_ENC + 1 + nFilas);
  const cLabel = rTotal.getCell(4);
  cLabel.value = "TOTAL";
  cLabel.font = { bold: true };
  cLabel.alignment = { horizontal: "center" };
  cLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
  cLabel.border = bordeFino();
  const cTotal = rTotal.getCell(5);
  cTotal.value = rem.granTotal;
  cTotal.numFmt = FMT_COP;
  cTotal.font = { bold: true };
  cTotal.alignment = { horizontal: "right" };
  cTotal.border = bordeFino();

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
