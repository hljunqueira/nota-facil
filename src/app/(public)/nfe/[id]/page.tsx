import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { PublicInvoiceActions } from "@/components/modules/invoices/PublicInvoiceActions";
import {
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileX,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cleanId = params.id.trim();
  const invoice = await prismaAdmin.invoice.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { chaveAcesso: cleanId },
      ],
    },
    include: { partner: true, tenant: true },
  });

  if (!invoice) {
    return {
      title: "Nota Fiscal não encontrada — Nota Fácil",
    };
  }

  const partner = invoice.partner?.razaoSocial || "Destinatário";
  const valor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(invoice.valorTotal) || 0);

  return {
    title: `NF-e Nº ${invoice.numero} — ${partner} | Nota Fácil`,
    description: `Acesse e baixe o DANFE (PDF) e XML da NF-e Nº ${invoice.numero} no valor de ${valor}.`,
    openGraph: {
      title: `NF-e Nº ${invoice.numero} (${partner})`,
      description: `Valor Total: ${valor}. Baixe a DANFE em PDF e o XML da SEFAZ com 1 clique.`,
    },
  };
}

function formatCnpj(cnpj?: string | null): string {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export default async function PublicInvoicePage({ params }: PageProps) {
  const cleanId = params.id.trim();
  const invoice = await prismaAdmin.invoice.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { chaveAcesso: cleanId },
        ...(cleanId.length >= 44
          ? [{ chaveAcesso: { contains: cleanId.substring(cleanId.length - 44) } }]
          : []),
      ],
    },
    include: {
      tenant: true,
      partner: true,
    },
  });

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Nota Fiscal Não Encontrada</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            O link acessado pode ter sido digitado incorretamente ou a nota fiscal informada não está disponível.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Ir para o Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(invoice.dataEmissao));

  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(invoice.valorTotal) || 0);

  // Modalidade e Operação
  let operationBadge = {
    label: "NF-e (Saída)",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };

  if (invoice.tipo === "ENTRADA") {
    operationBadge = {
      label: "Remessa de Tecido (CFOP 5901)",
      color: "bg-blue-50 text-blue-800 border-blue-200",
    };
  } else if (invoice.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO" || invoice.finalidade?.includes("COBRANÇA")) {
    operationBadge = {
      label: "Cobrança de Mão de Obra (CFOP 5124)",
      color: "bg-amber-50 text-amber-900 border-amber-300",
    };
  } else if (invoice.modalidadeEmissao === "RETORNO_MERCADORIA") {
    operationBadge = {
      label: "Retorno de Insumos (CFOP 5902)",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  } else if (invoice.modalidadeEmissao === "CONJUNTA") {
    operationBadge = {
      label: "Retorno e Cobrança (Nota Única)",
      color: "bg-violet-50 text-violet-800 border-violet-200",
    };
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Cabeçalho da Marca */}
        <header className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              NF
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block">
                Nota Fácil
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Portal de Documentos Fiscais
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-[11px] font-semibold text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ambiente Seguro</span>
          </div>
        </header>

        {/* Card Principal da NF-e */}
        <main className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Top Bar com Status SEFAZ */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${operationBadge.color}`}>
                {operationBadge.label}
              </span>

              {/* Status SEFAZ */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {invoice.status === "AUTORIZADA" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>NF-e Autorizada pela SEFAZ</span>
                  </>
                ) : invoice.status === "CANCELADA" ? (
                  <>
                    <FileX className="w-3.5 h-3.5 text-slate-400" />
                    <span>NF-e Cancelada na SEFAZ</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Status: {invoice.status}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  NF-e Nº {invoice.numero}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2">
                  <span>Série {invoice.serie}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formattedDate}
                  </span>
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Valor Total
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {formattedValue}
                </span>
              </div>
            </div>
          </div>

          {/* Dados das Partes (Emissor e Destinatário) */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Emissor (Oficina) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Emissor (Oficina)</span>
                </div>
                <p className="font-bold text-slate-900 text-sm leading-snug">
                  {invoice.tenant?.razaoSocial || "Oficina Emissora"}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  CNPJ: {formatCnpj(invoice.tenant?.cnpj)}
                </p>
                {invoice.tenant?.telefoneContato && (
                  <p className="text-xs text-slate-500">
                    Contato: {invoice.tenant.telefoneContato}
                  </p>
                )}
              </div>

              {/* Destinatário (Fábrica / Cliente) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Destinatário</span>
                </div>
                <p className="font-bold text-slate-900 text-sm leading-snug">
                  {invoice.partner?.razaoSocial || "Destinatário"}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  CNPJ: {formatCnpj(invoice.partner?.cnpj)}
                </p>
                {invoice.espelhoNumero && (
                  <p className="text-xs text-slate-600 font-medium">
                    Ref. Espelho de Produção: #{invoice.espelhoNumero}
                  </p>
                )}
              </div>
            </div>

            {/* Ações de Download e Interatividade */}
            <PublicInvoiceActions
              invoiceId={invoice.id}
              numero={invoice.numero}
              serie={invoice.serie}
              chaveAcesso={invoice.chaveAcesso}
              partnerNome={invoice.partner?.razaoSocial}
              hasPdf={!!invoice.pdfUrl}
              hasXml={!!invoice.xmlUrl}
            />
          </div>
        </main>

        {/* Rodapé Informativo */}
        <footer className="text-center py-4 space-y-1">
          <p className="text-xs text-slate-400">
            Documento Fiscal Eletrônico emitido conforme legislação tributária vigente.
          </p>
          <p className="text-[11px] text-slate-400">
            Plataforma <strong>Nota Fácil</strong> — Simplificando a gestão fiscal de confecções têxteis.
          </p>
        </footer>
      </div>
    </div>
  );
}
