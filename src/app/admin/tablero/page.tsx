import { requireAcceso } from "@/lib/auth";
import TableroAdmin from "./TableroAdmin";

export default async function TableroPage() {
  await requireAcceso("/admin/tablero");
  return <TableroAdmin />;
}
