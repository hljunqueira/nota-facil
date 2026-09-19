"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Users,
  CheckCircle2,
  History,
  LogOut,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Se estiver na tela de login administrativo, não renderiza o header e sidebar master
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Visão Geral", href: "/admin", icon: LayoutDashboard },
    { name: "Oficinas & Clientes", href: "/admin/tenants", icon: Users },
    { name: "Fila de Aprovação", href: "/admin/aprovacoes", icon: CheckCircle2 },
    { name: "Logs & Auditoria", href: "/admin/logs", icon: History },
  ];

  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = "/api/auth/logout?redirect=/admin/login?logged_out=true";
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header Master Admin */}
      <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <Image
              src="/logoNF.png"
              alt="Nota Fácil"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
            <span className="text-sm font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              Nota Fácil
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Admin
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://appnotafacil.online"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span>Área do Assinante</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-xs font-medium text-slate-800 leading-tight">
                {session?.user?.name || "Administrador"}
              </span>
              <span className="text-[11px] text-slate-400 leading-tight">
                {session?.user?.email}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-3 flex flex-col justify-between">
          <nav className="space-y-0.5" aria-label="Menu Administrativo">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-slate-900" : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Rodapé da Sidebar Admin */}
          <div className="pt-3 mt-6 border-t border-slate-100">
            <button
              onClick={handleSignOut}
              type="button"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Sair do Admin</span>
            </button>
          </div>
        </aside>

        {/* Admin Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
