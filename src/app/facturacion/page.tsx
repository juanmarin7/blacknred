import { requireAcceso } from "@/lib/auth";
import FacturacionView from "./FacturacionView";

export const metadata = { title: "Facturación — Black & Red" };

export default async function FacturacionPage() {
  await requireAcceso("/facturacion");
  return <FacturacionView />;
}
