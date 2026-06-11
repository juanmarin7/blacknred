"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PedidoRow, VistaPedidos } from "./types";

/**
 * Carga pedidos de una vista y hace "polling inteligente" cada 15s:
 * consulta primero la firma de cambios (Cantidad+Estado) y solo recarga
 * la tabla completa cuando algo cambió — port del patrón de la vista TV.
 */
export function usePedidos(vista: VistaPedidos, tvKey?: string) {
  const [pedidos, setPedidos] = useState<PedidoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(
    null,
  );
  const firmaRef = useRef<string | null>(null);

  const keyParam = tvKey ? `&key=${encodeURIComponent(tvKey)}` : "";

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedidos?vista=${vista}${keyParam}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Error ${res.status}`);
      }
      setPedidos((await res.json()) as PedidoRow[]);
      setUltimaActualizacion(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando pedidos");
    }
  }, [vista, keyParam]);

  useEffect(() => {
    // Carga inicial: el setState ocurre tras el await del fetch, no es síncrono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/pedidos/firma?${keyParam.replace("&", "")}`,
        );
        if (!res.ok) return;
        const { firma } = (await res.json()) as { firma: string };
        if (firmaRef.current === null) {
          firmaRef.current = firma;
          return;
        }
        if (firma !== firmaRef.current) {
          firmaRef.current = firma;
          cargar();
        }
      } catch {
        // fallo de red transitorio: se reintenta en el siguiente tick
      }
    };

    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [cargar, keyParam]);

  return { pedidos, error, ultimaActualizacion, recargar: cargar };
}
