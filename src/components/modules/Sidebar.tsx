"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Building2,
  FolderArchive,
  Settings,
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
    name: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar para Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4">
        <div className="space-y-1">
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
                    ? "bg-primary text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${
                    isActive ? "text-white" : "text-slate-500"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Rodapé da Sidebar */}
        <div className="mt-auto pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Nota Fácil v1.0 • PWA Ativo
          </p>
        </div>
      </aside>

      {/* Barra Inferior Fixa para Celular (Mobile First / PWA) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? "text-primaryDark font-bold"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              <item.icon
                className={`h-5 w-5 mb-0.5 ${
                  isActive ? "text-primary" : "text-slate-400"
                }`}
              />
              <span className="truncate max-w-[64px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default Sidebar;
