"use client";

import { useEffect, useRef, useState } from "react";

interface Opcion {
  id: string;
  label: string;
}

/**
 * Select con buscador (reemplaza select2 del formulario original).
 * Funciona igual en móvil y escritorio.
 */
export default function Combobox({
  opciones,
  valor,
  onChange,
  placeholder = "Buscar...",
}: {
  opciones: Opcion[];
  valor: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const seleccionada = opciones.find((o) => o.id === valor);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const filtradas = filtro.trim()
    ? opciones.filter((o) =>
        o.label.toLowerCase().includes(filtro.trim().toLowerCase()),
      )
    : opciones;

  return (
    <div ref={ref} className="relative mt-1.5">
      <button
        type="button"
        onClick={() => {
          setAbierto(!abierto);
          setFiltro("");
        }}
        className={`w-full rounded-md border border-line bg-black px-3 py-2.5 text-left text-base focus:border-accent focus:outline-none ${
          seleccionada ? "text-white" : "text-muted-2"
        }`}
      >
        {seleccionada ? seleccionada.label : "Seleccione una opcion..."}
        <span className="float-right text-muted-2">▾</span>
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <div className="sticky top-0 bg-surface p-2">
            <input
              autoFocus
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-line-strong bg-black px-3 py-2 text-base text-white focus:border-accent focus:outline-none"
            />
          </div>
          {filtradas.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-2">
              Sin resultados
            </div>
          ) : (
            filtradas.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setAbierto(false);
                }}
                className={`block w-full px-3 py-2.5 text-left text-base hover:bg-line-soft ${
                  o.id === valor ? "text-accent" : "text-white"
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
