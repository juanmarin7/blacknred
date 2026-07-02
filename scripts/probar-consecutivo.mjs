// Prueba de concurrencia del consecutivo atómico.
//
// Dispara N llamadas SIMULTÁNEAS a la función SQL `siguiente_codigo_pedido`
// y verifica que NO haya códigos repetidos (que es justo lo que fallaba con
// el bloqueo en memoria por instancia). Usa una clave de prueba, así que NO
// toca el contador real de QA ni de PROD.
//
// Uso (Node 22+):
//   node --env-file=.env.local scripts/probar-consecutivo.mjs [N]
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";

const N = Number(process.argv[2] ?? 50);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
      "Corré con: node --env-file=.env.local scripts/probar-consecutivo.mjs",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Clave única por corrida para partir siempre de cero y no ensuciar nada.
const clave = `test-concurrencia-${Date.now()}`;

console.log(`Disparando ${N} llamadas simultáneas (clave: ${clave})...`);

const resultados = await Promise.all(
  Array.from({ length: N }, () =>
    supabase.rpc("siguiente_codigo_pedido", { p_clave: clave, p_min: 0 }),
  ),
);

const errores = resultados.filter((r) => r.error);
if (errores.length) {
  console.error("Hubo errores en el RPC:", errores[0].error);
  process.exit(1);
}

const codigos = resultados.map((r) => Number(r.data));
const unicos = new Set(codigos);
const ordenados = [...codigos].sort((a, b) => a - b);
const contiguos =
  ordenados[0] === 1 && ordenados[ordenados.length - 1] === N;

console.log(`Recibidos: ${codigos.length} | únicos: ${unicos.size}`);
console.log(`Rango: ${ordenados[0]}..${ordenados[ordenados.length - 1]}`);

// Limpieza: borrar la fila de prueba.
await supabase.from("contadores_pedido").delete().eq("clave", clave);

if (unicos.size !== N) {
  console.error(`❌ FALLÓ: ${N - unicos.size} código(s) duplicado(s).`);
  process.exit(1);
}
if (!contiguos) {
  console.error("❌ FALLÓ: los códigos no son contiguos 1..N.");
  process.exit(1);
}
console.log(`✅ OK: ${N} códigos únicos y contiguos, sin duplicados.`);
