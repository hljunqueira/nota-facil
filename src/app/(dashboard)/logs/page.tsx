"use client";

import React, { useEffect, useState } from "react";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Sliders,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { getTenantLogsAction, LogCategory } from "@/actions/auditLogs";
import { LogDetailsModal, LogItem } from "@/components/modules/logs/LogDetailsModal";

export default function TenantLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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

  const loadLogs = async (currentPage = page, currentCat = categoria, currentSearch = search) => {
    setLoading(true);
    try {
      const res = await getTenantLogsAction({
        page: currentPage,
        limit: 20,
        categoria: currentCat,
        search: currentSearch,
      });

      setLogs(res.logs);
      setTotalPages(res.totalPages);
      setTotalCount(res.totalCount);
      setStats(res.stats);
    } catch (err) {
      console.error("Erro ao carregar logs da oficina:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page, categoria, search);
  }, [page, categoria]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1, categoria, search);
  };

  const handleCategoryChange = (newCat: LogCategory) => {
    setCategoria(newCat);
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
    if (acao.startsWith("SYNC_MDE") || acao.startsWith("MDE_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
          <RefreshCw className="w-3 h-3 text-indigo-600" />
          <span>Sincronização MDe</span>
        </span>
      );
    }
    if (acao.startsWith("NOTIFICACAO") || acao.startsWith("FALLBACK")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Send className="w-3 h-3 text-purple-600" />
          <span>Notificação</span>
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

  const getActionSummary = (log: LogItem) => {
    const detalhe = log.detalhe || {};
    if (log.acao === "WEBHOOK_AUTORIZADA") {
      return `NF-e autorizada com sucesso na SEFAZ. DANFE e XML sincronizados.`;
    }
    if (log.acao === "WEBHOOK_REJEITADA") {
      return `Rejeição SEFAZ: ${detalhe.mensagem_sefaz || detalhe.motivo || "Erro fiscal detectado."}`;
    }
    if (log.acao === "EMISSAO_NFE") {
      return `Emissão de NF-e transmitida para a Focus NFe. Ref: ${detalhe.idempotencyKey || log.entidadeId}`;
    }
    if (log.acao === "SOLICITACAO_CANCELAMENTO_NFE") {
      return `Solicitação de cancelamento enviada. Justificativa: "${detalhe.justificativa?.slice(0, 35)}..."`;
    }
    if (log.acao === "SYNC_MDE_AUTO" || log.acao === "SYNC_MDE_MANUAL") {
      return `Varredura MDe concluída: ${detalhe.novasImportadas || 0} novas notas importadas.`;
    }
    if (log.acao === "NOTIFICACAO_WHATSAPP") {
      return `Notificação de NF-e enviada via WhatsApp para ${detalhe.destinatarioNome || "contato"}.`;
    }
    if (log.acao === "NOTIFICACAO_EMAIL") {
      return `E-mail enviado com DANFE/XML anexados para ${detalhe.destinatarioEmail || "destinatário"}.`;
    }
    if (log.acao === "ATUALIZACAO_TOKENS_FISCAIS") {
      return `Credenciais e tokens fiscais da oficina atualizados.`;
    }
    return `Operação registrada no sistema (${log.acao}).`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Logs & Auditoria Fiscal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Rastreamento em tempo real de emissões, cancelamentos, webhooks SEFAZ e sincronizações
            </p>
          </div>
        </div>

        <button
          onClick={() => loadLogs(page, categoria, search)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
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
          <p className="text-2xl font-bold text-ink mt-2">{stats.totalGeral}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Histórico da oficina</span>
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
            <span className="text-xs font-semibold text-red-700">Rejeições SEFAZ</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-700 mt-2">{stats.totalRejeitadas}</p>
          <span className="text-[11px] text-red-600 mt-1 block">Erros fiscais e rejeições</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">Notificações Disparadas</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">{stats.totalNotificacoes}</p>
          <span className="text-[11px] text-purple-600 mt-1 block">WhatsApp e E-mails</span>
        </div>
      </div>

      {/* Filtros & Barra de Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  categoria === cat.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-ink"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Form de Pesquisa */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar chave, ação, ID..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-ink focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Filtrar
            </button>
          </form>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs">Carregando histórico de auditoria...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Data / Hora</th>
                  <th className="py-3.5 px-4">Status / Ação</th>
                  <th className="py-3.5 px-4">Origem</th>
                  <th className="py-3.5 px-4">Resumo do Evento</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.acao)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-600 font-semibold">
                        {log.actorType === "SYSTEM"
                          ? "Robô Sincronizador"
                          : log.actorType === "ADMIN"
                          ? "Administrador"
                          : "Oficina"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-ink font-medium max-w-md truncate">
                      {getActionSummary(log)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-semibold text-[11px] transition-all cursor-pointer"
                        title="Ver payload e detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500 text-[11px]">
              Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} eventos)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                title="Próxima página"
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
