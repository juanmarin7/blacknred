import ExcelJS from "exceljs";
import type { Remision } from "./remision";

/**
 * Genera el .xlsx de una remisión, con el mismo contenido que el documento
 * imprimible (`RemisionDoc`). Se usa tanto para la remisión original (M2) como
 * para la modificada (M3), ya que ambas comparten la forma `Remision`.
 */

const EMPRESA = {
  nombre: "BLACK&RED UNDERWEAR S.A.S",
  nit: "901510667-9",
  direccion: "CLL 47#52-17 INT 102",
  telefono: "3016868368",
  correo: "BLACKREDUNDERWEAR@GMAIL.COM",
};

const FMT_COP = '"$" #,##0';

function bordeFino(): Partial<ExcelJS.Borders> {
  const b = { style: "thin" as const, color: { argb: "FF000000" } };
  return { top: b, left: b, bottom: b, right: b };
}

const GRIS = "FFF0F0F0";

export async function construirExcelRemision(rem: Remision): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Black & Red";
  const ws = wb.addWorksheet("Remisión", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  ws.columns = [
    { width: 14 }, // A REF.
    { width: 12 }, // B CANTIDAD
    { width: 40 }, // C DESCRIPCIÓN
    { width: 16 }, // D VALOR UNI.
    { width: 18 }, // E TOTAL
  ];

  const numeroTxt =
    rem.numero > 0 ? String(rem.numero).padStart(4, "0") : "—";
  const etiqueta = (celda: string, texto: string) => {
    const c = ws.getCell(celda);
    c.value = texto;
    c.font = { bold: true };
  };

  // ── Título ──
  ws.mergeCells("A1:E1");
  const titulo = ws.getCell("A1");
  titulo.value = "REMISIÓN DESPACHO";
  titulo.font = { bold: true, size: 14 };
  titulo.alignment = { horizontal: "center", vertical: "middle" };

  // ── Empresa + REM N° ──
  ws.mergeCells("A2:C2");
  ws.getCell("A2").value = EMPRESA.nombre;
  ws.getCell("A2").font = { bold: true };
  etiqueta("D2", "REM N°:");
  ws.getCell("E2").value = numeroTxt;
  ws.getCell("E2").font = { bold: true };

  ws.mergeCells("A3:C3");
  ws.getCell("A3").value = `NIT ${EMPRESA.nit}`;
  etiqueta("D3", "FECHA:");
  ws.getCell("E3").value = rem.fecha;

  ws.mergeCells("A4:C4");
  ws.getCell("A4").value = EMPRESA.direccion;

  ws.mergeCells("A5:E5");
  ws.getCell("A5").value = `Tel ${EMPRESA.telefono}   ·   ${EMPRESA.correo}`;

  // ── Datos del cliente ──
  etiqueta("A7", "NOMBRE:");
  ws.mergeCells("B7:E7");
  ws.getCell("B7").value = rem.cliente.nombre;

  etiqueta("A8", "LOCAL:");
  ws.mergeCells("B8:E8");
  ws.getCell("B8").value = rem.cliente.local;

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

  // ── Tabla de productos ──
  const FILA_ENC = 12;
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

  let fila = FILA_ENC + 1;
  rem.items.forEach((it) => {
    const r = ws.getRow(fila);
    r.getCell(1).value = it.ref;
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(2).value = it.cantidad;
    r.getCell(2).alignment = { horizontal: "center" };
    r.getCell(3).value = it.descripcion;
    r.getCell(4).value = it.valorUni;
    r.getCell(4).numFmt = FMT_COP;
    r.getCell(5).value = it.total;
    r.getCell(5).numFmt = FMT_COP;
    for (let col = 1; col <= 5; col++) r.getCell(col).border = bordeFino();
    fila++;
  });

  // ── Fila de gran total ──
  const rTotal = ws.getRow(fila);
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
  cTotal.border = bordeFino();

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
