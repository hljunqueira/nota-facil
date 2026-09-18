"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
        {/* Informações da Oficina / Usuário */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs font-medium text-slate-900 leading-tight">
              {session?.user?.name || "Usuário"}
            </span>
            <span className="text-[11px] text-slate-500 leading-tight truncate max-w-[180px]">
              {session?.user?.tenantName || session?.user?.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
