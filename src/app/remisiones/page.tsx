import { requireAcceso } from "@/lib/auth";
import RemisionesView from "./RemisionesView";

export const metadata = { title: "Remisiones — Black & Red" };

export default async function RemisionesPage() {
  await requireAcceso("/remisiones");
  return <RemisionesView />;
}
