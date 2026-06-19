/** Barra de progreso indeterminada branded. Reutilizada por la pantalla de
 *  carga y por el overlay de acciones (guardar/procesar). */
export default function BarraCarga() {
  return (
    <div className="relative h-[3px] w-44 overflow-hidden rounded-full bg-line">
      <div className="absolute inset-y-0 w-1/3 rounded-full bg-accent animate-[barra-carga_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
