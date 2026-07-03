import { requireAcceso } from "@/lib/auth";
import RemisionView from "./RemisionView";

export const metadata = { title: "Remisión — Black & Red" };

export default async function RemisionPage() {
  await requireAcceso("/remision");
  return <RemisionView />;
}
