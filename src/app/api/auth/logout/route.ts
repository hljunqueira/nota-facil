import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function clearAllAuthCookies(response: NextResponse, req?: NextRequest) {
  // Padrão do W3C para forçar navegadores (Chrome, Edge, Firefox, Safari) a limparem cookies e storage
  response.headers.set("Clear-Site-Data", '"cookies", "storage"');

  const storeCookies = cookies().getAll();
  const reqCookies = req ? req.cookies.getAll() : [];
  const foundNames = new Set<string>();

  for (const c of [...storeCookies, ...reqCookies]) {
    foundNames.add(c.name);
  }

  const specificCookieNames = [
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.session-token.0",
    "__Secure-next-auth.session-token.1",
    "__Secure-next-auth.session-token.2",
    "next-auth.session-token",
    "next-auth.session-token.0",
    "next-auth.session-token.1",
    "next-auth.session-token.2",
    "__Host-next-auth.csrf-token",
    "next-auth.csrf-token",
    "__Secure-next-auth.callback-url",
    "next-auth.callback-url",
    "next-auth.pkce.code_verifier",
  ];

  for (const name of specificCookieNames) {
    foundNames.add(name);
  }

  for (const name of foundNames) {
    if (
      name.toLowerCase().includes("next-auth") ||
      name.toLowerCase().includes("session") ||
      name.toLowerCase().includes("csrf") ||
      name.toLowerCase().includes("token")
    ) {
      response.cookies.delete(name);

      // 1. Expiração imediata no host atual com secure=true (HTTPS)
      response.cookies.set(name, "", {
        maxAge: 0,
        path: "/",
        expires: new Date(0),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });

      // 2. Expiração sem secure (fallback)
      response.cookies.set(name, "", {
        maxAge: 0,
        path: "/",
        expires: new Date(0),
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });

      // 3. Expiração no domínio raiz .appnotafacil.online caso tenha sido setado com wildcard domain
      response.cookies.set(name, "", {
        maxAge: 0,
        path: "/",
        domain: ".appnotafacil.online",
        expires: new Date(0),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }
  }
}

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "appnotafacil.online";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  const redirectTarget = req.nextUrl.searchParams.get("redirect") || "/login?logged_out=true";

  let publicHost = host;
  if (
    publicHost.includes("0.0.0.0") ||
    publicHost.includes("127.0.0.1") ||
    publicHost.includes("localhost")
  ) {
    publicHost = redirectTarget.includes("admin")
      ? "admin.appnotafacil.online"
      : "appnotafacil.online";
  }

  const redirectUrl = new URL(redirectTarget, `${proto}://${publicHost}`);
  const response = NextResponse.redirect(redirectUrl);
  clearAllAuthCookies(response, req);

  return response;
}

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, loggedOut: true });
  clearAllAuthCookies(response, req);
  return response;
}
