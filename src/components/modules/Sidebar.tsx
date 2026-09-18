"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Building2,
  FolderArchive,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Notas Fiscais",
    href: "/notas",
    icon: FileText,
  },
  {
    name: "Parceiros",
    href: "/parceiros",
    icon: Building2,
  },
  {
    name: "Fechamento",
    href: "/fechamento",
    icon: FolderArchive,
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

// Itens principais exibidos na barra inferior mobile
const mobileItems = [
  { name: "Início", href: "/dashboard", icon: LayoutDashboard },
  { name: "Notas", href: "/notas", icon: FileText },
  { name: "Parceiros", href: "/parceiros", icon: Building2 },
  { name: "Fechamento", href: "/fechamento", icon: FolderArchive },
  { name: "Assinatura", href: "/assinatura", icon: CreditCard },
  { name: "Ajustes", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      {/* Sidebar para Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white sticky top-14 h-[calc(100vh-3.5rem)] p-4 justify-between">
        <nav className="space-y-1" aria-label="Menu Principal">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <item.icon
                  className={`h-4.5 w-4.5 shrink-0 ${
                    isActive ? "text-slate-900" : "text-slate-400"
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
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400 group-hover:text-rose-600" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Barra Inferior Fixa para Mobile */}
      <nav
        aria-label="Navegação Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-14 w-full items-center justify-around border-t border-slate-200 bg-white px-1"
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
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] transition-colors ${
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <item.icon
                className={`h-4 w-4 mb-1 ${
                  isActive ? "text-slate-900" : "text-slate-400"
                }`}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}

        {/* Botão Sair no Mobile */}
        <button
          onClick={handleSignOut}
          type="button"
          aria-label="Sair"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 mb-1 text-slate-400" />
          <span className="truncate">Sair</span>
        </button>
      </nav>
    </>
  );
}

export default Sidebar;
