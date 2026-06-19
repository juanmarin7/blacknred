# Black & Red — Web App (Next.js + Tailwind + PWA)

Migración de la app de pedidos de Apps Script a Next.js. Misma funcionalidad y
estilos; los datos de pedidos siguen viviendo en la misma Google Sheet. El login
y los usuarios viven en Supabase. Instalable como PWA en el celular.

Stack: **Next.js 16** (App Router, `src/proxy.ts` en vez de middleware),
**Tailwind v4**, **TypeScript**, **Supabase Auth**, **Google Sheets** como base de
datos, **recharts** para el tablero.

> ⚠️ Esta versión de Next tiene breaking changes (ver `AGENTS.md`): antes de
> tocar APIs de Next, leer los docs en `node_modules/next/dist/docs/`.

## Vistas y perfiles

Perfiles: `admin`, `vendedor`, `facturador`, `despachador` (en
`app_metadata.perfil`). El acceso por ruta se define en `src/lib/perfiles.ts`.

| Ruta | Qué es | Perfiles con acceso |
|---|---|---|
| `/login` | inicio de sesión | público |
| `/panel` | menú según perfil | todos (con sesión) |
| `/pedidos` | formulario de pedidos | admin, vendedor |
| `/despacho` | pendientes de despacho (editable) | admin, despachador |
| `/tv` | pantalla TV (solo lectura) | admin, despachador, o llave `?key=` |
| `/facturacion` | facturación | admin, facturador |
| `/estados` | vista de estados | admin, vendedor, despachador |
| `/admin/usuarios` | gestión de usuarios | **admin** |
| `/admin/tablero` | tablero de métricas | **admin** |
| `/cambiar-password` | cambio obligatorio de clave temporal | con sesión |

El **vendedor de cada pedido es el usuario autenticado** que lo registra: se
guarda su `display_name` (col G de la hoja Ventas) y su correo (col H). El nombre
sale de `user_metadata.display_name` (o `nombre`), con fallback derivado del
correo.

## Correr en local (modo demo, sin credenciales)

```bash
npm install
npm run dev
```

`.env.local` trae `MOCK_SHEETS=1`: abre en http://localhost:3000 con datos de
ejemplo y sin login (en desarrollo entra como admin). El tablero y el módulo de
usuarios corren en modo vacío en local (no hay datos inventados). Todo lo real se
prueba en el deploy de QA.

## Variables de entorno

Copia `.env.example` a `.env.local` y complétalas (en Vercel van en
**Settings → Environment Variables**).

| Variable | Para qué | Notas |
|---|---|---|
| `SPREADSHEET_ID` | hoja de pedidos | **único valor que difiere QA/PROD** |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | cuenta de servicio de Sheets | igual en todos los entornos |
| `GOOGLE_PRIVATE_KEY` | clave de la cuenta de servicio | entre comillas, con `\n` literales |
| `NEXT_PUBLIC_SUPABASE_URL` | proyecto Supabase | dominio pelado, **sin** `/rest/v1` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | llave pública (publishable) | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | llave secreta para el módulo admin | `sb_secret_...` · **nunca** `NEXT_PUBLIC` · no a git |
| `TV_ACCESS_KEY` | abrir `/tv` sin login | opcional |
| `MOCK_SHEETS` | modo demo local | solo en local; ausente en QA/PROD |

## Conectar la Google Sheet

1. Google Cloud Console → proyecto → habilita **Google Sheets API**.
2. Crea una **cuenta de servicio**, genera una **clave JSON** (`client_email` +
   `private_key`).
3. **Comparte la hoja de PROD y la de QA** con ese `client_email` como **Editor**.
4. Pon `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` y `SPREADSHEET_ID`.

## Login y usuarios (Supabase)

1. Proyecto en https://supabase.com. **Authentication** con **Email** y el
   **registro cerrado** (no se permite auto-registro).
2. **Llaves (sistema nuevo):** en **Settings → API Keys** usa la **publishable**
   (`sb_publishable_...`) para `NEXT_PUBLIC_SUPABASE_ANON_KEY` y crea una
   **secret** (`sb_secret_...`) para `SUPABASE_SERVICE_ROLE_KEY`. Deshabilita las
   *legacy API keys* una vez migrado.
3. **Primer admin (bootstrap manual):** crea un usuario en
   **Authentication → Users** y asígnale el perfil:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"perfil":"admin"}'::jsonb
   where email = 'correo@ejemplo.com';
   ```

   Nombre visible (opcional; el módulo lo gestiona después):

   ```sql
   update auth.users
   set raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || '{"display_name":"Nombre Apellido"}'::jsonb
   where email = 'correo@ejemplo.com';
   ```

4. **El resto de usuarios se crean desde la app** (ver abajo), sin SQL.

## Módulo de administración (perfil admin)

- **`/admin/usuarios`** — crear usuarios (correo, nombre, perfil), resetear
  contraseña, activar/desactivar y eliminar. Al crear/resetear se genera una
  **contraseña temporal** (se muestra una vez); el usuario debe **cambiarla en su
  primer ingreso** (`/cambiar-password`, forzado por `src/proxy.ts` vía
  `user_metadata.must_change_password`). Requiere `SUPABASE_SERVICE_ROLE_KEY`.
- **`/admin/tablero`** — métricas: total/pedidos/ticket con comparativo vs
  periodo anterior, tendencia, ventas por vendedor, estado de cobro, top
  productos/clientes, **pendientes de despacho** (antigüedad de los más
  atascados) y export a CSV. Filtro por vendedor y periodo (persistidos en la
  URL).

## Pantalla de TV

`TV_ACCESS_KEY=algo-secreto` y abre `https://tu-dominio/tv?key=algo-secreto`
(sin login, solo lectura).

## Deploy y entornos (Vercel)

**Un solo proyecto Vercel**, dos entornos por rama:

| Rama | Entorno Vercel | Hoja (`SPREADSHEET_ID`) |
|---|---|---|
| `qa` | Preview | hoja de QA |
| `master` | Production | hoja de PROD |

- La **única** variable que cambia por entorno es `SPREADSHEET_ID`. La cuenta de
  servicio y las llaves de Supabase son las mismas (la hoja de QA debe estar
  compartida con el `client_email`).
- `SUPABASE_SERVICE_ROLE_KEY` debe estar en **Preview y Production**.
- Para que una rama genere Preview necesita un commit propio. Las variables
  nuevas solo aplican tras un **redeploy**.
- **Protección:** si el Preview pide login de Vercel, ajusta
  **Settings → Deployment Protection** (la app igual exige su propio login).

## Logos y PWA

Pendiente el **logo real**: hoy `src/lib/branding.ts` carga los logos de Google
Drive, los íconos PWA (`public/icons/icon-192.png`, `icon-512.png`) son
placeholders, y la pantalla de carga (`src/components/PantallaCarga.tsx`) usa el
wordmark "BLACK & RED" como placeholder. Con el archivo (PNG 1024×1024 o SVG) se
reemplazan los tres.

## Estructura

- `src/lib/sheets.ts` — acceso a Google Sheets (cache 10 s, escrituras
  serializadas; reemplaza `SpreadsheetApp` + `LockService`).
- `src/lib/pedidos.ts` — lógica de negocio (consecutivo, tallas, despachos
  parciales, estados) y agregación del tablero (`getResumenVentas`).
- `src/lib/usuarios.ts` — gestión de usuarios vía Supabase Admin API.
- `src/lib/auth.ts` / `src/lib/perfiles.ts` — sesión, perfiles y accesos.
- `src/lib/supabase/{server,client,admin}.ts` — clientes de Supabase.
- `src/proxy.ts` — protege rutas (sesión + perfil + cambio de clave forzado).
- `src/app/api/*` — endpoints que consumen las vistas y el módulo admin.
- `src/components/{PantallaCarga,BarraCarga,LoadingOverlay}.tsx` — carga branded.
- `public/sw.js` — service worker de la PWA.
```
