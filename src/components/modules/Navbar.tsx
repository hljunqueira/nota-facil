"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { LogOut } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
          <Image
            src="/logoNF.png"
            alt="Nota Fácil"
            width={28}
            height={28}
            className="object-contain"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Nota Fácil
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Badge de Ambiente Discreto */}
        <EnvironmentBadge ambiente={session?.user?.ambiente} />

        {/* Informações da Oficina / Usuário */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-medium text-slate-900 leading-tight">
              {session?.user?.name || "Usuário"}
            </span>
            <span className="text-[11px] text-slate-500 leading-tight truncate max-w-[160px]">
              {session?.user?.tenantName || session?.user?.email}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Sair da conta"
            type="button"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
