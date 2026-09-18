"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { FileCheck, LogOut, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <Image
            src="/logoNF.png"
            alt="Nota Fácil"
            width={34}
            height={34}
            className="object-contain"
            priority
          />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-ink leading-none">
              Nota Fácil
            </span>
            <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">
              Facção & Retorno
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Badge de Ambiente Fixo no Topo */}
        <EnvironmentBadge ambiente={session?.user?.ambiente} />

        {/* Botão de Atalho Rápido para Fechamento do Contador */}
        <Link
          href="/fechamento"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primaryDark transition-colors hover:bg-primary/20"
        >
          <FileCheck className="h-4 w-4 text-primary" />
          <span>Fechar Mês Contador</span>
        </Link>

        {/* Informações do Usuário & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-ink leading-tight">
              {session?.user?.name || "Usuário"}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
              {session?.user?.tenantName || session?.user?.email}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
            title="Sair do sistema"
            type="button"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
