"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

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
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 shadow-2xs">
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
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
            Nota Fácil
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Informações da Oficina / Usuário */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="flex flex-col text-right max-w-[130px] sm:max-w-[200px]">
            <span className="text-xs font-bold text-slate-900 leading-tight truncate">
              {session?.user?.name || "Usuário"}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 leading-tight truncate">
              {session?.user?.tenantName || session?.user?.email}
            </span>
          </div>
        </div>

        {/* Botão Sair no Mobile (visível apenas em telas menores) */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          title="Sair da conta"
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
