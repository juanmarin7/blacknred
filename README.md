# Black & Red — Web App (Next.js + Tailwind + PWA)

Migración de la app de Apps Script a Next.js. Misma funcionalidad, mismos
estilos, los datos siguen viviendo en la misma Google Sheet. Instalable como
PWA en el celular.

## Vistas

| Ruta | Equivalente Apps Script | Perfiles con acceso |
|---|---|---|
| `/login` | login | público |
| `/panel` | panel del login | todos (con sesión) |
| `/pedidos` | formulario | admin, vendedor |
| `/despacho` | vista pendientes (editable) | admin, despachador |
| `/tv` | vista pendientes TV (solo lectura) | admin, despachador, o llave `?key=` |
| `/facturacion` | vista facturación | admin, facturador |
| `/estados` | vista vendedor | admin, vendedor, despachador |

## Correr en local (modo demo, sin credenciales)

```bash
npm install
npm run dev
```

`.env.local` ya viene con `MOCK_SHEETS=1`: la app abre en
http://localhost:3000 con datos de ejemplo y sin login (en desarrollo entra
como admin). Sirve para revisar el diseño y los flujos.

## Conectar la Google Sheet real

1. Entra a https://console.cloud.google.com → crea un proyecto (o usa uno).
2. **APIs y servicios → Biblioteca** → habilita **Google Sheets API**.
3. **IAM y administración → Cuentas de servicio** → crear cuenta de servicio
   (p. ej. `blacknred-web`). No necesita roles del proyecto.
4. Dentro de la cuenta → **Claves → Agregar clave → JSON**. Se descarga un
   archivo con `client_email` y `private_key`.
5. **Comparte la Google Sheet** (la de PROD y la de QA) con el
   `client_email` de la cuenta de servicio como **Editor**.
6. En `.env.local`: pon `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`
   (entre comillas, tal cual viene en el JSON) y `SPREADSHEET_ID`.
   Quita o comenta `MOCK_SHEETS=1`.

## Configurar el login (Supabase)

1. Crea un proyecto en https://supabase.com (plan gratuito).
2. **Authentication → Sign In / Up** → deja solo **Email** habilitado y
   **desactiva "Allow new users to sign up"** (registro cerrado).
3. **Authentication → Users → Add user** → crea cada usuario con email y
   contraseña.
4. Asigna el perfil de cada usuario en **SQL Editor**:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"perfil": "admin"}'
   where email = 'correo@ejemplo.com';
   ```

   Perfiles válidos: `admin`, `vendedor`, `facturador`, `despachador`.
   (Opcional: nombre que se muestra en el panel)

   ```sql
   update auth.users
   set raw_user_meta_data = raw_user_meta_data || '{"nombre": "Juan"}'
   where email = 'correo@ejemplo.com';
   ```

5. En **Settings → API** copia la URL y la anon key a `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Sin estas variables, en desarrollo la app entra directo como admin (modo
preview); en producción exige configurarlas.

## Pantalla de TV

Define `TV_ACCESS_KEY=algo-secreto` y abre en el televisor:
`https://tu-dominio/tv?key=algo-secreto` — no necesita login y solo lee.

## Deploy (Vercel)

1. Sube este folder a un repositorio de GitHub.
2. En https://vercel.com → **Import Project** → selecciona el repo.
3. En **Environment Variables** agrega las mismas de `.env.local`
   (sin `MOCK_SHEETS`). Para QA puedes crear un segundo proyecto apuntando
   al `SPREADSHEET_ID` de QA.
4. Deploy. La PWA queda instalable desde el navegador del celular
   ("Agregar a pantalla de inicio").

## Logos

Hoy se cargan de Google Drive (igual que la app original). Para mejor
rendimiento: copia los archivos a `public/` y actualiza
`src/lib/branding.ts`. Lo mismo aplica a los íconos de la PWA
(`public/icons/icon-192.png` y `icon-512.png`, hoy son placeholders).

## Estructura

- `src/lib/sheets.ts` — acceso a Google Sheets con cache de 10 s y
  escrituras serializadas (reemplaza `SpreadsheetApp` + `LockService`).
- `src/lib/pedidos.ts` — toda la lógica de negocio portada de los `.gs`
  (consecutivo, tallas, despachos parciales, estados).
- `src/lib/tallas.ts` — parseo del formato `"S : 5 | M : 3"`.
- `src/proxy.ts` — protege todas las rutas (sesión + perfil).
- `src/app/api/*` — endpoints que consumen las vistas.
- `public/sw.js` — service worker de la PWA.
