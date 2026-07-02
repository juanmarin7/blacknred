-- ───────────────────────────────────────────────────────────────
-- Black & Red — Consecutivo atómico del código de pedido
-- Ejecutar UNA vez en el SQL Editor de Supabase (QA y PROD comparten
-- el mismo proyecto Supabase, así que se corre una sola vez; la fila del
-- contador se crea por SPREADSHEET_ID, ver `p_clave`).
--
-- Por qué: en Vercel corren varias instancias a la vez; el bloqueo en
-- memoria del server solo serializa DENTRO de una instancia. Postgres da
-- atomicidad real, así que dos pedidos simultáneos nunca duplican código.
-- ───────────────────────────────────────────────────────────────

create table if not exists public.contadores_pedido (
  clave text primary key,
  valor bigint not null default 0
);

-- Incremento atómico. `p_min` es un piso: el nuevo código siempre queda por
-- encima de lo que ya haya en la hoja (por si alguien la edita a mano o por
-- filas de "parcial" que reusan un código viejo). Auto-siembra en el 1er uso.
create or replace function public.siguiente_codigo_pedido(
  p_clave text,
  p_min bigint default 0
)
returns bigint
language plpgsql
as $$
declare
  v bigint;
begin
  insert into public.contadores_pedido as c (clave, valor)
  values (p_clave, greatest(p_min, 0) + 1)
  on conflict (clave) do update
    set valor = greatest(c.valor, p_min) + 1
  returning c.valor into v;
  return v;
end;
$$;

-- Solo el servidor (service_role) la invoca vía RPC.
grant execute on function public.siguiente_codigo_pedido(text, bigint) to service_role;
