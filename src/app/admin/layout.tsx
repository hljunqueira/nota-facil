"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Sliders,
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
    { name: "Configurações Master", href: "/admin/configuracoes", icon: Sliders },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-ink">
      {/* Header Master Admin */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center">
              <Image
                src="/logoNF.png"
                alt="Nota Fácil"
                width={26}
                height={26}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Nota Fácil
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Admin Master
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                Gestão Multi-tenant da Plataforma
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <span>Ir para Área do Cliente</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">
                {session?.user?.name || "Administrador"}
              </span>
              <span className="text-[10px] text-slate-400">
                {session?.user?.email}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
              title="Sair do painel master"
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${
                      isActive ? "text-amber-400" : "text-slate-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-[11px]">
            <p className="font-semibold flex items-center gap-1.5 text-amber-950 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              Controle Restrito
            </p>
            Modificações nas oficinas afetam a emissão fiscal direta na SEFAZ e Focus NFe.
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
