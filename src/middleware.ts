import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function applyLogoutHeadersAndCookies(response: NextResponse) {
  response.headers.set("Clear-Site-Data", '"cookies", "storage"');
  const cookieNames = [
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

  for (const name of cookieNames) {
    response.cookies.delete(name);
    response.cookies.set(name, "", { maxAge: 0, path: "/", secure: true, expires: new Date(0), httpOnly: true, sameSite: "lax" });
    response.cookies.set(name, "", { maxAge: 0, path: "/", secure: false, expires: new Date(0), httpOnly: true, sameSite: "lax" });
    response.cookies.set(name, "", { maxAge: 0, path: "/", domain: ".appnotafacil.online", secure: true, expires: new Date(0), httpOnly: true, sameSite: "lax" });
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const isAdminSubdomain = host.startsWith("admin.");

  // 1. Libera arquivos estáticos, assets de imagem, PWA, storage e webhooks da API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/storage") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cnpj") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".pdf") ||
    pathname.endsWith(".xml")
  ) {
    return NextResponse.next();
  }

  // 2. Redirecionamento da rota /admin para o subdomínio admin (se acessado pelo domínio principal)
  if (!isAdminSubdomain && pathname.startsWith("/admin")) {
    const targetHost = process.env.NODE_ENV === "production" ? "admin.appnotafacil.online" : host;
    const protocol = req.nextUrl.protocol || "https:";
    const adminUrl = new URL(pathname + req.nextUrl.search, `${protocol}//${targetHost}`);
    return NextResponse.redirect(adminUrl);
  }

  // 3. Recupera o token JWT de sessão
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 4. Regras exclusivas quando no subdomínio admin (admin.appnotafacil.online)
  if (isAdminSubdomain) {
    // Raiz do subdomínio admin -> redireciona para /admin ou /admin/login
    if (pathname === "/") {
      if (!token) {
        const loginUrl = new URL("/admin/login", req.url);
        loginUrl.searchParams.set("callbackUrl", "/admin");
        return NextResponse.redirect(loginUrl);
      }
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      // Usuário comum tenant tentando acessar o subdomínio admin
      return NextResponse.redirect(new URL("/dashboard", "https://appnotafacil.online"));
    }

    // Acessou /login no subdomínio admin -> redireciona para a tela de login exclusiva do Admin
    if (pathname === "/login") {
      if (token && token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      const adminLoginUrl = new URL("/admin/login", req.url);
      if (req.nextUrl.search) {
        adminLoginUrl.search = req.nextUrl.search;
      }
      return NextResponse.redirect(adminLoginUrl);
    }

    if (pathname.startsWith("/admin")) {
      // Libera a tela de login do admin
      if (pathname === "/admin/login") {
        if (req.nextUrl.searchParams.get("logged_out") === "true") {
          const res = NextResponse.next();
          applyLogoutHeadersAndCookies(res);
          return res;
        }
        if (token && token.role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        return NextResponse.next();
      }

      if (!token) {
        const loginUrl = new URL("/admin/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", "https://appnotafacil.online"));
      }
      return NextResponse.next();
    }

    // Se no subdomínio admin acessar rotas do tenant, manda para o domínio principal
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/notas") ||
      pathname.startsWith("/parceiros") ||
      pathname.startsWith("/configuracoes") ||
      pathname.startsWith("/fechamento")
    ) {
      return NextResponse.redirect(new URL(pathname, "https://appnotafacil.online"));
    }

    return NextResponse.next();
  }

  // 5. Regras no domínio principal (appnotafacil.online)
  // Raiz "/" (Landing Page pública)
  if (pathname === "/") {
    if (token && token.role === "TENANT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Páginas públicas (/login, /cadastro, /recuperar-senha, /redefinir-senha)
  if (
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/recuperar-senha" ||
    pathname.startsWith("/redefinir-senha")
  ) {
    // Se o usuário deslogou explicitamente, limpa tudo e não redireciona de volta
    if (req.nextUrl.searchParams.get("logged_out") === "true") {
      const response = NextResponse.next();
      applyLogoutHeadersAndCookies(response);
      return response;
    }

    if (token && token.role === "TENANT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Se for ADMIN ou não autenticado, permite ver a tela de login/cadastro/recuperação
    return NextResponse.next();
  }

  // Rotas autenticadas do tenant (/dashboard, /notas, /parceiros, /assinatura, etc.)
  if (!token || token.role !== "TENANT") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
