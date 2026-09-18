import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const isAdminSubdomain = host.startsWith("admin.");

  // 1. Libera arquivos estáticos, assets de imagem, PWA e webhooks da API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cnpj") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg")
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
    if (token) {
      if (token.role === "ADMIN") {
        const targetHost = process.env.NODE_ENV === "production" ? "admin.appnotafacil.online" : host;
        return NextResponse.redirect(new URL("/admin", `https://${targetHost}`));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Páginas públicas (/login e /cadastro)
  if (pathname === "/login" || pathname === "/cadastro") {
    if (token) {
      if (token.role === "ADMIN") {
        const targetHost = process.env.NODE_ENV === "production" ? "admin.appnotafacil.online" : host;
        return NextResponse.redirect(new URL("/admin", `https://${targetHost}`));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Rotas autenticadas do tenant (/dashboard, /notas, /parceiros, etc.)
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.role === "ADMIN") {
    const targetHost = process.env.NODE_ENV === "production" ? "admin.appnotafacil.online" : host;
    return NextResponse.redirect(new URL("/admin", `https://${targetHost}`));
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
