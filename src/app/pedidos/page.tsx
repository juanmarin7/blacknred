import { requireAcceso } from "@/lib/auth";
import PedidosForm from "./PedidosForm";

export const metadata = { title: "Registro de pedidos — Black & Red" };

export default async function PedidosPage() {
  await requireAcceso("/pedidos");
  return <PedidosForm />;
}
