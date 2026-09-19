import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión del organizador y manda al login a quien no la tenga.
// La autorización real vive en RLS y en el layout del panel; esto es solo la
// primera barrera.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/organizador/login";

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/organizador/login", request.url));
  }
  if (user && isLogin) {
    return NextResponse.redirect(new URL("/organizador", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/organizador/:path*"],
};
