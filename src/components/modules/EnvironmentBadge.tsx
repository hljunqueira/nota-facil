import React from "react";
import { AmbienteFiscal } from "@prisma/client";

interface EnvironmentBadgeProps {
  ambiente?: AmbienteFiscal | string | null;
  className?: string;
}

export function EnvironmentBadge({
  ambiente = "HOMOLOGACAO",
  className = "",
}: EnvironmentBadgeProps) {
  const isProducao = ambiente === "PRODUCAO";

  if (isProducao) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-900 border border-amber-500/30 ${className}`}
        title="Ambiente com validade jurídica e tributária real"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
        </span>
        <span>PRODUÇÃO FISCAL</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-200/80 text-slate-700 border border-slate-300 ${className}`}
      title="Ambiente de testes para homologação — sem validade fiscal"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
      <span>HOMOLOGAÇÃO (TESTES)</span>
    </div>
  );
}

export default EnvironmentBadge;
