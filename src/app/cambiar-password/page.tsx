import { redirect } from "next/navigation";
import { getSesion } from "@/lib/auth";
import CambiarPasswordForm from "./CambiarPasswordForm";

export default async function CambiarPasswordPage() {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");

  return <CambiarPasswordForm nombre={sesion.nombre} />;
}
