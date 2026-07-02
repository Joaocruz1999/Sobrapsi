import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

const PUBLIC_APP_PATHS = [
  "/app/login",
  "/app/registro",
  "/app/ativar-conta",
  "/app/alterar-senha",
];

// Chaves acessadas dinamicamente para evitar inlining em build (lidas em runtime).
const MAINTENANCE_FLAG_KEY = "MAINTENANCE_MODE";
const MAINTENANCE_SECRET_KEY = "MAINTENANCE_SECRET";
const BYPASS_COOKIE = "sobrapsi_bypass";

function handleMaintenance(request: NextRequest): NextResponse | null {
  if (process.env[MAINTENANCE_FLAG_KEY] !== "true") return null;

  const { pathname, searchParams } = request.nextUrl;
  const secret = process.env[MAINTENANCE_SECRET_KEY];

  // Concede o acesso via link secreto e grava cookie de bypass.
  if (secret && searchParams.get("acesso") === secret) {
    const target = request.nextUrl.clone();
    target.searchParams.delete("acesso");
    const response = NextResponse.redirect(target);
    response.cookies.set(BYPASS_COOKIE, secret, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  const alwaysAllowed =
    pathname === "/manutencao" || pathname.startsWith("/api/webhooks");
  const hasBypass =
    !!secret && request.cookies.get(BYPASS_COOKIE)?.value === secret;

  if (alwaysAllowed || hasBypass) return null;

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = "/manutencao";
  maintenanceUrl.search = "";
  return NextResponse.rewrite(maintenanceUrl);
}

export async function middleware(request: NextRequest) {
  const maintenanceResponse = handleMaintenance(request);
  if (maintenanceResponse) return maintenanceResponse;

  const { pathname } = request.nextUrl;

  if (PUBLIC_APP_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    const token = request.cookies.get("sobrapsi_session")?.value;
    if (!token) {
      const loginUrl = new URL("/app/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const session = await verifySessionToken(token);
    if (!session) {
      const loginUrl = new URL("/app/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.mustChangePassword && pathname !== "/app/alterar-senha") {
      return NextResponse.redirect(new URL("/app/alterar-senha", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
