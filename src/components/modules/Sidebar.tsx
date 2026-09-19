"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Building2,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";

const navigationItems = [
  {
    name: "Visão Geral",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Notas Fiscais",
    href: "/notas",
    icon: FileText,
  },
  {
    name: "Fábricas",
    href: "/parceiros",
    icon: Building2,
  },
  {
    name: "Assinatura",
    href: "/assinatura",
    icon: CreditCard,
  },
  {
    name: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

// Itens na barra inferior mobile (5 itens com área tátil ampliada de 20% da tela cada)
const mobileItems = [
  { name: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notas Fiscais", href: "/notas", icon: FileText },
  { name: "Fábricas", href: "/parceiros", icon: Building2 },
  { name: "Assinatura", href: "/assinatura", icon: CreditCard },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = "/api/auth/logout?redirect=/login?logged_out=true";
  };

  return (
    <>
      {/* Sidebar para Desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white sticky top-14 h-[calc(100vh-3.5rem)] p-3.5 justify-between select-none">
        <nav className="space-y-1.5" aria-label="Menu Principal">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <item.icon
                  className={`h-4.5 w-4.5 shrink-0 ${
                    isActive ? "text-emerald-400" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar Desktop com Botão de Sair */}
        <div className="pt-3 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            type="button"
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Barra Inferior Fixa para Mobile Ampliada (h-16 / 64px, touch-friendly para polegar) */}
      <nav
        aria-label="Navegação Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-1 shadow-lg pb-safe"
      >
        {mobileItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all rounded-xl cursor-pointer ${
                isActive
                  ? "text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? "bg-emerald-50 text-emerald-600" : ""
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${
                    isActive ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 truncate max-w-full px-0.5 text-center leading-tight">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default Sidebar;
