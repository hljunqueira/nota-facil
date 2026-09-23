"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { getPartnersAction } from "@/actions/partners";
import { PartnerModal } from "@/components/modules/partners/PartnerModal";
import { PartnerDeleteModal } from "@/components/modules/partners/PartnerDeleteModal";

export default function ParceirosPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<any | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<any | null>(null);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await getPartnersAction({ search });
      setPartners(data);
    } catch (err) {
      console.error("Erro ao carregar parceiros:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPartners();
  };

  const handleOpenCreate = () => {
    setPartnerToEdit(null);
    setShowModal(true);
  };

  const handleOpenEdit = (partner: any) => {
    setPartnerToEdit(partner);
    setShowModal(true);
  };

  const handleOpenDelete = (partner: any) => {
    setPartnerToDelete(partner);
    setShowDeleteModal(true);
  };

  const formatCnpj = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (val?: string | null) => {
    if (!val) return "-";
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  // KPIs
  const totalPartners = partners.length;
  const activeFiscalPartners = partners.filter((p) => p.totalInvoices > 0).length;
  const partnersWithWhatsApp = partners.filter((p) => Boolean(p.telefone)).length;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Fábricas Parceiras
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fábricas e marcas clientes que enviam remessas de corte para sua confecção
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs sm:text-xs font-bold shadow-xs cursor-pointer transition-all w-full sm:w-auto min-h-[44px] sm:min-h-0 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Fábrica Parceira</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total de Fábricas</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-ink">{totalPartners}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Confecções registradas na sua conta
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Com Movimentação Fiscal</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-ink">
            {activeFiscalPartners}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Fábricas com notas de remessa ou devolução
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Envio Automático (WhatsApp)</span>
            <MessageSquare className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-ink">
            {partnersWithWhatsApp}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Prontas para receber DANFE e XML automático
          </p>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          />
        </form>

        <button
          type="button"
          onClick={loadPartners}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-xs cursor-pointer transition-colors"
        >
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Tabela de Parceiros */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Carregando fábricas parceiras...</p>
        </div>
      ) : partners.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-ink">Nenhuma fábrica parceira encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Cadastre as confecções que terceirizam serviços para sua facção ou importe o primeiro XML de remessa para cadastro automático.
          </p>
          <div className="mt-4">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar 1ª Fábrica</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Visualização Mobile: Cards Nativos de Fábricas (< 768px) */}
          <div className="block md:hidden space-y-3.5">
            {partners.map((p) => {
              const cleanPhone = p.telefone?.replace(/\D/g, "");
              const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

              return (
                <div
                  key={`mob-p-${p.id}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
                >
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-ink leading-tight">
                          {p.razaoSocial}
                        </h3>
                        {p.nomeFantasia && p.nomeFantasia !== p.razaoSocial && (
                          <span className="text-xs text-slate-500 font-medium block">
                            Marca: {p.nomeFantasia}
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-400">
                          CNPJ: {formatCnpj(p.cnpj)}
                        </span>
                      </div>
                    </div>

                    <div>
                      {p.totalInvoices > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {p.totalInvoices} nota(s)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          0 notas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalhes Fiscais do Parceiro */}
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-slate-100">
                    {p.modoEmissao === "CONJUNTO" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200/60">
                        Nota Única (Conjunta)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        Retorno + Cobrança Separados
                      </span>
                    )}

                    <span className="text-slate-500 font-medium">
                      Espelho: <strong className="text-slate-700">{p.modeloEspelho || "RITMI"}</strong>
                    </span>
                  </div>

                  {/* Contato & Botões de Ação Táteis */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200/60 min-h-[44px]"
                      >
                        <Phone className="w-4 h-4 text-[#25D366]" />
                        <span>WhatsApp / Telefone</span>
                      </a>
                    ) : (
                      <div className="flex-1 text-xs text-slate-400 italic flex items-center">
                        Sem telefone cadastrado
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
                      title="Editar fábrica"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleOpenDelete(p)}
                      className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer ${
                        p.totalInvoices > 0
                          ? "text-slate-400 bg-slate-50 border-slate-200"
                          : "text-rose-500 bg-rose-50 border-rose-200/60 hover:bg-rose-100"
                      }`}
                      title={
                        p.totalInvoices > 0
                          ? "Bloqueado para exclusão (possui notas)"
                          : "Excluir fábrica"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visualização Desktop: Tabela Fluida (>= 768px) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden max-w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Fábrica / Confecção</th>
                    <th className="py-3.5 px-4">CNPJ</th>
                    <th className="py-3.5 px-4">Regra Fiscal / Espelho</th>
                    <th className="py-3.5 px-4">Canais de Contato</th>
                    <th className="py-3.5 px-4 text-center">Notas Fiscais</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {partners.map((p) => {
                    const cleanPhone = p.telefone?.replace(/\D/g, "");
                    const whatsappUrl = cleanPhone
                      ? `https://wa.me/55${cleanPhone}`
                      : null;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Nome / Razão Social */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-ink">
                                {p.razaoSocial}
                              </p>
                              {p.nomeFantasia && p.nomeFantasia !== p.razaoSocial && (
                                <span className="text-[11px] text-slate-500">
                                  Marca: {p.nomeFantasia}
                                </span>
                              )}
                              {p.inscricaoEstadual && (
                                <span className="text-[10px] font-mono text-slate-400 block">
                                  IE: {p.inscricaoEstadual}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* CNPJ */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          {formatCnpj(p.cnpj)}
                        </td>

                        {/* Regra Fiscal / Espelho */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div>
                              {p.modoEmissao === "CONJUNTO" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200/60">
                                  Nota Única (Conjunta)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  Separada (2 Etapas)
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Espelho: <strong className="text-slate-700">{p.modeloEspelho || "RITMI"}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Canais de Contato */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            {p.telefone ? (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono text-slate-700">
                                  {formatPhone(p.telefone)}
                                </span>
                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                                    title="Iniciar conversa no WhatsApp"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sem telefone</span>
                            )}

                            {p.email ? (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <a
                                  href={`mailto:${p.email}`}
                                  className="hover:underline truncate max-w-[180px]"
                                  title={p.email}
                                >
                                  {p.email}
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Sem e-mail</span>
                            )}
                          </div>
                        </td>

                        {/* Contagem de Notas Fiscais */}
                        <td className="py-3.5 px-4 text-center">
                          {p.totalInvoices > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              <FileText className="w-3 h-3" />
                              {p.totalInvoices} nota(s)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                              Nenhuma nota
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors cursor-pointer"
                              title="Editar dados da fábrica parceira"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenDelete(p)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                p.totalInvoices > 0
                                  ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                  : "text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                              }`}
                              title={
                                p.totalInvoices > 0
                                  ? "Bloqueado para exclusão (possui notas vinculadas)"
                                  : "Excluir fábrica parceira"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modais */}
      <PartnerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        partnerToEdit={partnerToEdit}
        onSuccess={(msg) => {
          setToastMessage(msg);
          loadPartners();
        }}
      />

      <PartnerDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        partner={partnerToDelete}
        onSuccess={(msg) => {
          setToastMessage(msg);
          loadPartners();
        }}
      />
    </div>
  );
}
