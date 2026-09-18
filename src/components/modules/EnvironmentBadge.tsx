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

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
        isProducao
          ? "bg-slate-50 border-slate-200 text-slate-700"
          : "bg-slate-50 border-slate-200 text-slate-500"
      } ${className}`}
      title={
        isProducao
          ? "Ambiente com validade jurídica e tributária real"
          : "Ambiente de testes (sem validade fiscal)"
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isProducao ? "bg-emerald-600" : "bg-slate-400"
        }`}
      />
      <span>{isProducao ? "Produção" : "Homologação"}</span>
    </div>
  );
}

export default EnvironmentBadge;
