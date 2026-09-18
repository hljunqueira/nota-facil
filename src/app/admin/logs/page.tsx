"use client";

import React, { useEffect, useState } from "react";
import {
  History,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Sliders,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { getAdminLogsAction, LogCategory } from "@/actions/auditLogs";
import { LogDetailsModal, LogItem } from "@/components/modules/logs/LogDetailsModal";

interface AdminLogItem extends LogItem {
  tenant?: {
    id: string;
    razaoSocial: string;
    cnpj: string;
  } | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tenants, setTenants] = useState<{ id: string; razaoSocial: string; cnpj: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("todos");

  const [stats, setStats] = useState({
    totalGeral: 0,
    totalEmissoes: 0,
    totalAutorizadas: 0,
    totalRejeitadas: 0,
    totalNotificacoes: 0,
  });

  const [categoria, setCategoria] = useState<LogCategory>("todas");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const loadLogs = async (
    currentPage = page,
    currentCat = categoria,
    currentSearch = search,
    currentTenant = selectedTenantId
  ) => {
    setLoading(true);
    try {
      const res = await getAdminLogsAction({
        page: currentPage,
        limit: 20,
        categoria: currentCat,
        search: currentSearch,
        tenantId: currentTenant,
      });

      setLogs(res.logs as AdminLogItem[]);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalCount);
      setStats(res.stats);
      if (res.tenants) {
        setTenants(res.tenants);
      }
    } catch (err) {
      console.error("Erro ao carregar logs globais do admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page, categoria, search, selectedTenantId);
  }, [page, categoria, selectedTenantId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1, categoria, search, selectedTenantId);
  };

  const handleCategoryChange = (newCat: LogCategory) => {
    setCategoria(newCat);
    setPage(1);
  };

  const handleTenantChange = (tId: string) => {
    setSelectedTenantId(tId);
    setPage(1);
  };

  const getActionBadge = (acao: string) => {
    if (acao === "WEBHOOK_AUTORIZADA" || acao === "EMISSAO_NFE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{acao === "WEBHOOK_AUTORIZADA" ? "Autorizada SEFAZ" : "Emissão Iniciada"}</span>
        </span>
      );
    }
    if (acao === "WEBHOOK_REJEITADA" || acao === "EMISSAO_NFE_REPROVADA" || acao === "CANCELAMENTO_NFE_FALHA") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span>Rejeitada / Falha</span>
        </span>
      );
    }
    if (acao.startsWith("CANCELAMENTO") || acao.startsWith("SOLICITACAO_CANCELAMENTO")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Cancelamento</span>
        </span>
      );
    }
    if (acao.startsWith("NOTIFICACAO") || acao.startsWith("FALLBACK")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Send className="w-3 h-3 text-indigo-600" />
          <span>Notificação</span>
        </span>
      );
    }
    if (acao.startsWith("SYNC_MDE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <RefreshCw className="w-3 h-3 text-sky-600" />
          <span>Sincronização MDe</span>
        </span>
      );
    }
    if (acao.includes("ASAAS") || acao.includes("ASSINATURA") || acao.includes("PAGAMENTO")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          <span>Financeiro / Asaas</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Sliders className="w-3 h-3 text-slate-500" />
        <span>Configuração</span>
      </span>
    );
  };

  const formatEventSummary = (log: AdminLogItem) => {
    const detalhe = log.detalhe || {};
    if (log.acao === "EMISSAO_NFE") {
      return `Emissão de NF-e enviada à SEFAZ (Valor: R$ ${detalhe.valorTotal || "0,00"}).`;
    }
    if (log.acao === "WEBHOOK_AUTORIZADA") {
      return `NF-e autorizada pela SEFAZ. Protocolo: ${detalhe.protocolo || "registrado"}.`;
    }
    if (log.acao === "WEBHOOK_REJEITADA") {
      return `Rejeição SEFAZ: ${detalhe.mensagem_sefaz || detalhe.erros?.[0]?.mensagem || "Erro na validação"}.`;
    }
    if (log.acao === "WEBHOOK_CANCELADA") {
      return `Cancelamento de NF-e homologado pela SEFAZ.`;
    }
    if (log.acao === "NOTIFICACAO_WHATSAPP") {
      return `WhatsApp enviado para ${detalhe.telefone || "destinatário"}.`;
    }
    if (log.acao === "NOTIFICACAO_EMAIL") {
      return `E-mail enviado para ${detalhe.email || "destinatário"}.`;
    }
    if (log.acao === "SYNC_MDE_MANUAL" || log.acao === "SYNC_MDE_AUTO") {
      return `Consulta de notas recebidas na SEFAZ (${detalhe.totalNotasSincronizadas || 0} novas notas).`;
    }
    if (log.acao === "SINCRONIZACAO_ASSINATURA_ASAAS") {
      return `Assinatura sincronizada no Asaas (Vencimento: dia ${detalhe.diaVencimento || 10}).`;
    }
    if (log.acao === "PAGAMENTO_CONFIRMADO_ASAAS") {
      return `Pagamento confirmado no Asaas via ${detalhe.formaPagamento || "Pix/Boleto"}.`;
    }
    return `Operação registrada no sistema (${log.acao}).`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-800">
            <History className="w-6 h-6 text-slate-800" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Logs & Auditoria Global
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Rastreamento em tempo real de emissões, cancelamentos, webhooks SEFAZ e eventos financeiros
            </p>
          </div>
        </div>

        <button
          onClick={() => loadLogs()}
          disabled={loading}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-900" : "text-slate-500"}`} />
          <span>Atualizar Logs</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Operações</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalGeral}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {selectedTenantId === "todos" ? "Todas as oficinas" : "Oficina selecionada"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Notas Autorizadas</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{stats.totalAutorizadas}</p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Aprovadas na SEFAZ</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Rejeições SEFAZ</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{stats.totalRejeitadas}</p>
          <span className="text-[11px] text-rose-600 mt-1 block">Erros fiscais e rejeições</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">Notificações Disparadas</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{stats.totalNotificacoes}</p>
          <span className="text-[11px] text-indigo-600 mt-1 block">WhatsApp e E-mails</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Seletor de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "todas", label: "Todas" },
              { id: "emissao", label: "Emissões" },
              { id: "sefaz", label: "SEFAZ Webhooks" },
              { id: "cancelamento", label: "Cancelamentos" },
              { id: "mde", label: "Sincronização MDe" },
              { id: "notificacao", label: "Notificações" },
              { id: "config", label: "Configurações" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id as LogCategory)}
                type="button"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoria === cat.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Filtro por Oficina */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer w-full md:w-56"
            >
              <option value="todos">Todas as Oficinas ({tenants.length})</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.razaoSocial}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Busca por texto */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por chave de acesso, CNPJ, ação ou ID do evento..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Oficina / Cliente</th>
                <th className="py-3 px-4">Status / Ação</th>
                <th className="py-3 px-4">Origem</th>
                <th className="py-3 px-4">Resumo do Evento</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-900 mb-2" />
                    <span>Carregando logs de auditoria...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>Nenhum evento localizado com os filtros selecionados.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      {log.tenant ? (
                        <div>
                          <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                            {log.tenant.razaoSocial}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {log.tenant.cnpj}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sistema Global</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.acao)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium text-[11px]">
                      {log.actorType === "SYSTEM"
                        ? "Webhook / Sistema"
                        : log.actorType === "ADMIN"
                        ? "Administrador"
                        : "Usuário Oficina"}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate text-[11px]">
                      {formatEventSummary(log)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        type="button"
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40">
            <span>
              Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} eventos)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Log */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
