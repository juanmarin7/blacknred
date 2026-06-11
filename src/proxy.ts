import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antes "middleware"): refresca la sesión de Supabase y protege todas
 * las rutas. A diferencia de la app de Apps Script, aquí nadie puede entrar a
 * una vista con solo conocer la URL.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin Supabase configurado: en desarrollo se permite todo (modo preview);
  // las páginas muestran el aviso correspondiente.
  if (!url || !anon) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: no quitar. Refresca el token y mantiene viva la sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tvConLlave =
    pathname === "/tv" &&
    Boolean(process.env.TV_ACCESS_KEY) &&
    searchParams.get("key") === process.env.TV_ACCESS_KEY;

  const esPublica =
    pathname === "/login" ||
    tvConLlave ||
    pathname.startsWith("/api/"); // las APIs validan sesión por su cuenta

  if (!user && !esPublica) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const panelUrl = request.nextUrl.clone();
    panelUrl.pathname = "/panel";
    panelUrl.search = "";
    return NextResponse.redirect(panelUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
