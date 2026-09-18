import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home, LayoutDashboard, HelpCircle, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Elementos visuais de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center p-3 shadow-2xl shadow-primary/20">
            <Image
              src="/logoNF.png"
              alt="Nota Fácil"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Badge 404 */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
          <FileQuestion className="w-4 h-4" />
          <span>Erro 404 • Página não encontrada</span>
        </div>

        {/* Título Principal */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Ops! Não encontramos essa página.
        </h1>

        {/* Descrição */}
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          O endereço que você tentou acessar não existe, foi movido ou pode estar temporariamente fora do ar.
        </p>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primaryDark text-white font-semibold text-sm shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Ir para o Dashboard</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>Página Inicial</span>
          </Link>
        </div>

        {/* Suporte */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Precisa de ajuda? Fale com nosso suporte técnico</span>
        </div>
      </div>
    </main>
  );
}
