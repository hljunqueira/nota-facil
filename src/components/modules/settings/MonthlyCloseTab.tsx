"use client";

import React, { useState, useEffect } from "react";
import {
  FileArchive,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Download,
  Share2,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Smartphone,
  MessageCircle,
  Mail,
  ShieldCheck,
  Coins,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
} from "lucide-react";
import {
  getMonthlyCloseConfigAction,
  enqueueMonthlyCloseAction,
  getMonthlyCloseHistoryAction,
  getMonthlyClosePreviewAction,
  MonthlyClosePreviewData,
} from "@/actions/monthlyClose";

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

export function MonthlyCloseTab() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Mês imediatamente anterior (fechamento padrão da contabilidade)
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [mes, setMes] = useState<number>(prevMonth);
  const [ano, setAno] = useState<number>(prevYear);
  const [emailContador, setEmailContador] = useState<string>("");
  const [contadorNome, setContadorNome] = useState<string | null>(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Pré-visualização das Notas e Resumo Tributário
  const [preview, setPreview] = useState<MonthlyClosePreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const downloadUrl = `/api/contador/download?mes=${mes}&ano=${ano}`;
  const mesNome = MESES.find((m) => m.value === mes)?.label || String(mes);

  const prevMonthLabel = MESES.find((m) => m.value === prevMonth)?.label || "";
  const currentMonthLabel = MESES.find((m) => m.value === currentMonth)?.label || "";

  // Carrega configurações e histórico
  const loadData = async () => {
    setLoadingConfig(true);
    setLoadingHistory(true);

    try {
      const [cfg, hist] = await Promise.all([
        getMonthlyCloseConfigAction(),
        getMonthlyCloseHistoryAction(),
      ]);

      if (cfg.contadorEmail) {
        setEmailContador(cfg.contadorEmail);
      }
      if (cfg.contadorNome) {
        setContadorNome(cfg.contadorNome);
      }
      setHistory(hist || []);
    } catch (err: any) {
      console.error("[MonthlyCloseTab] Erro ao carregar dados:", err);
      setErrorMessage("Erro ao carregar dados do contador.");
    } finally {
      setLoadingConfig(false);
      setLoadingHistory(false);
    }
  };

  // Carrega pré-visualização das notas para o mês/ano selecionado
  const loadPreview = async (selectedMes: number, selectedAno: number) => {
    setLoadingPreview(true);
    try {
      const res = await getMonthlyClosePreviewAction({ mes: selectedMes, ano: selectedAno });
      setPreview(res);
    } catch (err: any) {
      console.error("[MonthlyCloseTab] Erro ao carregar prévia das notas:", err);
      setErrorMessage("Não foi possível carregar as notas do mês selecionado.");
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadPreview(mes, ano);
  }, [mes, ano]);

  const handleCopyKey = (chave: string) => {
    if (!chave) return;
    navigator.clipboard.writeText(chave);
    setCopiedKey(chave);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const formatMoney = (val: number) => {
    return Number(val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // 1. Download Direto no Celular ou Computador
  const handleDownloadDirect = () => {
    if (!preview || preview.totalNotas === 0) {
      setErrorMessage("Não há notas autorizadas neste mês para gerar o arquivo.");
      return;
    }

    setDownloading(true);
    setErrorMessage(null);
    try {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Notas_Contador_${String(mes).padStart(2, "0")}_${ano}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage("Download iniciado! O arquivo .ZIP com XMLs, PDFs e planilha está sendo salvo.");
    } catch {
      setErrorMessage("Não foi possível iniciar o download automático.");
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  // 2. Disparo por E-mail
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || preview.totalNotas === 0) {
      setErrorMessage("Não há notas autorizadas neste mês para enviar ao contador.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setToastMessage(null);

    try {
      const res = await enqueueMonthlyCloseAction({
        mes,
        ano,
        contadorEmail: emailContador?.trim() || undefined,
      });

      if (res.success) {
        setToastMessage(`Pacote de notas do mês ${mesNome}/${ano} enviado com sucesso para ${emailContador}!`);
        setTimeout(() => loadData(), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao enviar notas para o contador.");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Compartilhar / Enviar no WhatsApp
  const handleShareWhatsApp = (customUrl?: string) => {
    if (!preview || preview.totalNotas === 0) {
      setErrorMessage("Não há notas autorizadas neste mês para compartilhar.");
      return;
    }

    const url = customUrl || `${window.location.origin}${downloadUrl}`;
    const text = `📦 *Envio de Notas Fiscais — ${mesNome}/${ano}*\n\nOlá! Segue o pacote oficial com ${preview.totalNotas} nota(s) fiscal(is) autorizada(s), DANFEs em PDF, XMLs e relatório de conferência com segregação de CFOP 5124 (Mão de Obra) vs 5902/5904 (Retorno de Insumos).\n\n📥 *Link para Baixar o Arquivo (.ZIP):* ${url}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Notas Fiscais ${mesNome}/${ano}`,
          text,
          url,
        })
        .catch(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // Quantidade de notas para os atalhos
  const prevMonthCount = preview?.mesesComNotas.find((m) => m.mes === prevMonth && m.ano === prevYear)?.count;
  const currentMonthCount = preview?.mesesComNotas.find((m) => m.mes === currentMonth && m.ano === currentYear)?.count;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast de Sucesso */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card Principal: Seleção de Competência e Envio */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Enviar Notas para o Contador
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Selecione o mês de fechamento, confira as notas fiscais e baixe o pacote compactado (.ZIP) ou envie diretamente à contabilidade.
            </p>
          </div>

          <button
            onClick={() => loadPreview(mes, ano)}
            disabled={loadingPreview}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Atualizar lista de notas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? "animate-spin text-primary" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* ATALHOS RÁPIDOS DE COMPETÊNCIA: MÊS ANTERIOR (RECOMENDADO) vs MÊS ATUAL */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            1. Selecione a Competência (Qual mês enviar?)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pílula: Mês Anterior (Fechamento Padrão) */}
            <button
              type="button"
              onClick={() => {
                setMes(prevMonth);
                setAno(prevYear);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                mes === prevMonth && ano === prevYear
                  ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">
                    {prevMonthLabel}/{prevYear}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Recomendado Contador
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fechamento do mês fiscal anterior para cálculo do DAS.
                </p>
              </div>

              {prevMonthCount !== undefined && (
                <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                  {prevMonthCount} nota{prevMonthCount !== 1 ? "s" : ""}
                </span>
              )}
            </button>

            {/* Pílula: Mês Atual (Em Aberto) */}
            <button
              type="button"
              onClick={() => {
                setMes(currentMonth);
                setAno(currentYear);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                mes === currentMonth && ano === currentYear
                  ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">
                    {currentMonthLabel}/{currentYear}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    Mês Atual em Aberto
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Notas emitidas na competência em andamento.
                </p>
              </div>

              {currentMonthCount !== undefined && (
                <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                  {currentMonthCount} nota{currentMonthCount !== 1 ? "s" : ""}
                </span>
              )}
            </button>
          </div>

          {/* Seletores manuais de Mês e Ano */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Outro Mês de Referência:
              </label>
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white transition-all cursor-pointer"
              >
                {MESES.map((m) => {
                  const c = preview?.mesesComNotas.find((item) => item.mes === m.value && item.ano === ano)?.count;
                  return (
                    <option key={m.value} value={m.value}>
                      {m.label} {c !== undefined && c > 0 ? `(${c} nota${c > 1 ? "s" : ""})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ano de Referência:
              </label>
              <input
                type="number"
                min={2020}
                max={2035}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* 2. CARDS DE RESUMO FISCAL DO MÊS SELECIONADO */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Resumo Fiscal da Competência ({mesNome}/{ano})
            </label>
            {loadingPreview && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                Atualizando valores...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Base de Cálculo Tributável (CFOP 5124) */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-700" />
                  Base Tributável (CFOP 5124)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  Simples Nacional
                </span>
              </div>
              <div className="text-lg font-black font-mono text-emerald-900">
                {preview ? formatMoney(preview.baseTributavelSimples) : "R$ 0,00"}
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight">
                Mão de obra de costura efetiva. Único valor que incide imposto na guia DAS.
              </p>
            </div>

            {/* Card 2: Retorno Não Tributável (CFOP 5902 / 5904) */}
            <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-700" />
                  Não Tributável (CFOP 5902/5904)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900">
                  R$ 0,00 Imposto
                </span>
              </div>
              <div className="text-lg font-black font-mono text-sky-900">
                {preview ? formatMoney(preview.totalNaoTributavel) : "R$ 0,00"}
              </div>
              <p className="text-[11px] text-sky-800 leading-tight">
                Devolução física de insumos da fábrica. ICMS suspenso/diferido por lei.
              </p>
            </div>

            {/* Card 3: Total de Documentos Autorizados */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileArchive className="w-4 h-4 text-slate-600" />
                  Documentos no Pacote
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {preview ? preview.totalNotas : 0} nota(s)
                </span>
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {preview ? formatMoney(preview.totalGeral) : "R$ 0,00"}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {preview && preview.totalRemessas > 0
                  ? `Inclui R$ ${preview.totalRemessas.toFixed(2).replace(".", ",")} em remessas de entrada (5901).`
                  : "Total contábil bruto movimentado no período."}
              </p>
            </div>
          </div>
        </div>

        {/* 3. LISTAGEM DAS NOTAS FISCAIS DO MÊS */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                3. Notas Fiscais Incluídas no Envio ({mesNome}/{ano})
              </label>
              <p className="text-[11px] text-slate-500">
                Confira os documentos que farão parte do arquivo ZIP e da planilha oficial do contador.
              </p>
            </div>

            {preview && preview.totalNotas > 0 && (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                {preview.totalNotas} nota(s) autorizada(s)
              </span>
            )}
          </div>

          {loadingPreview ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Buscando notas fiscais da competência...</span>
            </div>
          ) : !preview || preview.notas.length === 0 ? (
            <div className="p-8 text-center bg-amber-50/50 rounded-2xl border border-amber-200 text-amber-900 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <div className="text-xs font-bold">
                Nenhuma nota fiscal autorizada encontrada para {mesNome}/{ano}.
              </div>
              <p className="text-[11px] text-amber-700 max-w-md mx-auto">
                Não existem emissões ou entradas registradas para este período. Escolha outro mês acima para baixar ou enviar ao contador.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* VISÃO DESKTOP: TABELA */}
              <div className="hidden md:block overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3.5">Nota / Série</th>
                      <th className="py-3 px-3">Natureza / CFOP</th>
                      <th className="py-3 px-3">Fábrica / Parceiro</th>
                      <th className="py-3 px-3">Data</th>
                      <th className="py-3 px-3 text-right">Valor Total</th>
                      <th className="py-3 px-3 text-right">Base Simples</th>
                      <th className="py-3 px-3.5 text-center">Arquivos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {preview.notas.map((nota) => (
                      <tr key={nota.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 font-mono">
                            NF #{nota.numero}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Série {nota.serie} • {nota.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {nota.cfopPrincipal === "5124" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              CFOP 5124 • Mão de Obra
                            </span>
                          ) : nota.cfopPrincipal === "5901" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              CFOP 5901 • Remessa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              CFOP {nota.cfopPrincipal} • Retorno
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                            {nota.parceiroNome}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {nota.parceiroCnpj || "CNPJ não informado"}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {new Date(nota.dataEmissao).toLocaleDateString("pt-BR")}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                          {formatMoney(nota.valorTotal)}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {nota.baseCalculoSimples > 0 ? (
                            <span className="text-emerald-700 font-mono font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
                              {formatMoney(nota.baseCalculoSimples)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">
                              R$ 0,00 (Isento)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            {nota.pdfUrl ? (
                              <a
                                href={nota.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Visualizar DANFE PDF"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-600" />
                              </a>
                            ) : null}

                            {nota.xmlUrl ? (
                              <a
                                href={nota.xmlUrl}
                                download
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Baixar XML"
                              >
                                <Download className="w-3.5 h-3.5 text-slate-600" />
                              </a>
                            ) : null}

                            {nota.chaveAcesso ? (
                              <button
                                type="button"
                                onClick={() => handleCopyKey(nota.chaveAcesso!)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title={copiedKey === nota.chaveAcesso ? "Chave copiada!" : "Copiar Chave SEFAZ"}
                              >
                                {copiedKey === nota.chaveAcesso ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISÃO MOBILE: CARDS TOUCH-FRIENDLY */}
              <div className="block md:hidden space-y-2.5">
                {preview.notas.map((nota) => (
                  <div
                    key={nota.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-mono flex items-center gap-1.5">
                          <span>NF #{nota.numero}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Série {nota.serie})
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-700 mt-0.5">
                          {nota.parceiroNome}
                        </div>
                      </div>

                      {nota.cfopPrincipal === "5124" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          CFOP 5124
                        </span>
                      ) : nota.cfopPrincipal === "5901" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          CFOP 5901
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                          CFOP {nota.cfopPrincipal}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Data Emissão</span>
                        <span className="font-mono text-slate-700">
                          {new Date(nota.dataEmissao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Valor da Nota</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatMoney(nota.valorTotal)}
                        </span>
                      </div>
                    </div>

                    {nota.baseCalculoSimples > 0 && (
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 text-[11px] font-medium flex items-center justify-between">
                        <span>Base de Cálculo Simples (DAS):</span>
                        <span className="font-bold font-mono">
                          {formatMoney(nota.baseCalculoSimples)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {nota.pdfUrl && (
                        <a
                          href={nota.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-rose-600" />
                          <span>DANFE PDF</span>
                        </a>
                      )}

                      {nota.xmlUrl && (
                        <a
                          href={nota.xmlUrl}
                          download
                          className="flex-1 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Download className="w-4 h-4 text-slate-700" />
                          <span>XML</span>
                        </a>
                      )}

                      {nota.chaveAcesso && (
                        <button
                          type="button"
                          onClick={() => handleCopyKey(nota.chaveAcesso!)}
                          className="min-h-[44px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
                        >
                          {copiedKey === nota.chaveAcesso ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. AÇÕES DE ENVIO E DOWNLOAD DO PACOTE OFICIAL (.ZIP) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            4. Baixar ou Enviar o Fechamento Oficial
          </label>

          {/* BOX 1: BAIXAR NO CELULAR OU COMPUTADOR */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  Opção 1: Baixar no Celular ou Computador
                </span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Gera o arquivo <strong>.ZIP</strong> com todos os XMLs, DANFEs em PDF e planilha de conferência contábil de <strong>{mesNome}/{ano}</strong>.
                </p>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                Download Imediato
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadDirect}
                disabled={downloading || !preview || preview.totalNotas === 0}
                className="flex-1 min-w-[220px] min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>
                  Baixar Pacote Oficial (.ZIP) {preview && preview.totalNotas > 0 ? `• ${preview.totalNotas} nota(s)` : ""}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp()}
                disabled={!preview || preview.totalNotas === 0}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-800 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>

          {/* BOX 2: ENVIAR DIRETAMENTE POR E-MAIL AO CONTADOR */}
          <form onSubmit={handleSendEmail} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                Opção 2: Enviar Diretamente por E-mail à Contabilidade
              </span>
              {loadingConfig && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando cadastro...
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
                E-mail do Contador
              </label>
              <input
                type="email"
                value={emailContador}
                onChange={(e) => setEmailContador(e.target.value)}
                placeholder="fiscal@contabilidade.com.br"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:border-primary transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {contadorNome
                  ? `Contador vinculado: ${contadorNome}`
                  : "Informe o e-mail da sua contabilidade para envio automático com o anexo ZIP e relatório CSV."}
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !preview || preview.totalNotas === 0}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando para o contador...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Disparar Fechamento por E-mail</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Histórico de Envios Anteriores */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800">
              Histórico de Envios para a Contabilidade
            </h3>
          </div>
          <button
            onClick={loadData}
            disabled={loadingHistory}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Carregando histórico...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhum envio registrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {history.map((log) => {
              const detalhe = (log.detalhe as any) || {};
              const zipUrl = detalhe.zipUrl;
              return (
                <div
                  key={log.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        Competência {detalhe.mesAno || log.entidadeId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {log.acao === "FECHAMENTO_MENSAL_CONCLUIDO" ? "Concluído" : "Processando"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {detalhe.totalNotas !== undefined
                        ? `${detalhe.totalNotas} nota(s) incluída(s)`
                        : "Notas empacotadas"}
                      {detalhe.contadorEmail ? ` • Enviado para ${detalhe.contadorEmail}` : ""}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {zipUrl ? (
                      <a
                        href={zipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Baixar cópia ZIP"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar ZIP</span>
                      </a>
                    ) : (
                      <button
                        onClick={handleDownloadDirect}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Baixar pacote"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar ZIP</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleShareWhatsApp(zipUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                      title="Compartilhar no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
