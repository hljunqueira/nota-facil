"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Building2,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  FileSpreadsheet,
  FileText,
  Upload,
  Layers,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { savePartnerAction, lookupPartnerCnpjAction } from "@/actions/partners";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerToEdit?: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
    cnpj: string;
    inscricaoEstadual?: string | null;
    email?: string | null;
    telefone?: string | null;
    modoEmissao?: string | null;
    modeloEspelho?: string | null;
    modeloEspelhoUrl?: string | null;
    emailExpedicao?: string | null;
    emailFinanceiro?: string | null;
    whatsappFinanceiro?: string | null;
  } | null;
  onSuccess: (message: string) => void;
}

export function PartnerModal({
  isOpen,
  onClose,
  partnerToEdit,
  onSuccess,
}: PartnerModalProps) {
  const [activeTab, setActiveTab] = useState<"CADASTRO" | "FISCAL" | "ESPELHO">("CADASTRO");

  // Dados Básicos
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Regras Fiscais & Modelo
  const [modoEmissao, setModoEmissao] = useState<"SEPARADO" | "CONJUNTO">("SEPARADO");
  const [modeloEspelho, setModeloEspelho] = useState("RITMI");
  const [modeloEspelhoUrl, setModeloEspelhoUrl] = useState("");
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);

  // Contatos Diretos
  const [emailExpedicao, setEmailExpedicao] = useState("");
  const [emailFinanceiro, setEmailFinanceiro] = useState("");
  const [whatsappFinanceiro, setWhatsappFinanceiro] = useState("");

  const [loading, setLoading] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cnpjSuccessInfo, setCnpjSuccessInfo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (partnerToEdit) {
      setRazaoSocial(partnerToEdit.razaoSocial || "");
      setNomeFantasia(partnerToEdit.nomeFantasia || "");
      setCnpj(formatCnpj(partnerToEdit.cnpj || ""));
      setInscricaoEstadual(partnerToEdit.inscricaoEstadual || "");
      setEmail(partnerToEdit.email || "");
      setTelefone(formatPhone(partnerToEdit.telefone || ""));
      setModoEmissao((partnerToEdit.modoEmissao as any) || "SEPARADO");
      setModeloEspelho(partnerToEdit.modeloEspelho || "RITMI");
      setModeloEspelhoUrl(partnerToEdit.modeloEspelhoUrl || "");
      setEmailExpedicao(partnerToEdit.emailExpedicao || "");
      setEmailFinanceiro(partnerToEdit.emailFinanceiro || "");
      setWhatsappFinanceiro(formatPhone(partnerToEdit.whatsappFinanceiro || ""));
    } else {
      resetForm();
    }
    setActiveTab("CADASTRO");
    setErrorMessage(null);
    setCnpjSuccessInfo(null);
  }, [partnerToEdit, isOpen]);

  const resetForm = () => {
    setRazaoSocial("");
    setNomeFantasia("");
    setCnpj("");
    setInscricaoEstadual("");
    setEmail("");
    setTelefone("");
    setModoEmissao("SEPARADO");
    setModeloEspelho("RITMI");
    setModeloEspelhoUrl("");
    setTemplateFileName(null);
    setEmailExpedicao("");
    setEmailFinanceiro("");
    setWhatsappFinanceiro("");
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
    if (!val) return "";
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

  const handleLookupCnpj = async () => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) {
      setErrorMessage("Digite um CNPJ válido com 14 dígitos para consultar.");
      return;
    }

    setSearchingCnpj(true);
    setErrorMessage(null);
    setCnpjSuccessInfo(null);

    try {
      const res = await lookupPartnerCnpjAction(clean);
      if (res.success && res.data) {
        setRazaoSocial(res.data.razaoSocial || "");
        setNomeFantasia(res.data.nomeFantasia || res.data.razaoSocial || "");
        if (res.data.email && !email) setEmail(res.data.email);
        if (res.data.telefone && !telefone) {
          setTelefone(formatPhone(res.data.telefone));
        }
        if (clean === "72305295000115") {
          setInscricaoEstadual("252740106");
          setModeloEspelho("RITMI");
          setModoEmissao("SEPARADO");
        }
        setCnpjSuccessInfo(
          `Dados localizados: ${res.data.municipio}/${res.data.uf}`
        );
      } else {
        setErrorMessage(res.error || "CNPJ não encontrado na Receita Federal.");
      }
    } catch {
      setErrorMessage("Falha de conexão ao consultar dados do CNPJ.");
    } finally {
      setSearchingCnpj(false);
    }
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTemplateFileName(file.name);
      setModeloEspelhoUrl(`/storage/templates/${file.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await savePartnerAction({
        id: partnerToEdit?.id,
        razaoSocial,
        nomeFantasia,
        cnpj,
        inscricaoEstadual: inscricaoEstadual || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        modoEmissao,
        modeloEspelho,
        modeloEspelhoUrl: modeloEspelhoUrl || undefined,
        emailExpedicao: emailExpedicao || undefined,
        emailFinanceiro: emailFinanceiro || undefined,
        whatsappFinanceiro: whatsappFinanceiro || undefined,
      });

      if (res.success) {
        onSuccess(res.message || "Fábrica parceira salva com sucesso!");
        onClose();
      } else {
        setErrorMessage(res.error || "Erro ao salvar fábrica parceira.");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Erro inesperado ao processar dados da fábrica parceira."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                {partnerToEdit ? "Editar Fábrica Parceira" : "Cadastrar Nova Fábrica"}
              </h2>
              <p className="text-xs text-slate-500">
                Configure regras fiscais de retorno, modelo de espelho e faturamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex border-b border-slate-100 bg-slate-50/30 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("CADASTRO")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "CADASTRO"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Dados Cadastrais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FISCAL")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "FISCAL"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>2. Como Emitir (Separado / Junto)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ESPELHO")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "ESPELHO"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>3. Modelo do Espelho</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {cnpjSuccessInfo && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cnpjSuccessInfo}</span>
            </div>
          )}

          {/* ABA 1: DADOS CADASTRAIS */}
          {activeTab === "CADASTRO" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNPJ da Fábrica <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    required
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCnpj}
                    disabled={searchingCnpj || cnpj.replace(/\D/g, "").length !== 14}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-50 cursor-pointer transition-all shrink-0"
                  >
                    {searchingCnpj ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar CNPJ</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Preencha o CNPJ e clique em Buscar para preencher razão social e endereço direto da Receita Federal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razão Social (Nome Oficial) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex: RITMI CONFECCOES LTDA"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Fantasia / Marca
                  </label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Ex: Ritmi"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="Ex: 252740106 ou ISENTO"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Necessária para emissão das notas fiscais de devolução e cobrança.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp / Telefone Geral
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail Principal
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="fiscal@fabrica.com.br"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: REGRA FISCAL (SEPARADO VS CONJUNTO) */}
          {activeTab === "FISCAL" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-2">
                  Como esta fábrica exige as Notas Fiscais?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card Separado */}
                  <div
                    onClick={() => setModoEmissao("SEPARADO")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                      modoEmissao === "SEPARADO"
                        ? "border-slate-900 bg-slate-50/80 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-slate-700" />
                        Emissão Separada (2 Etapas)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-700">
                        Padrão Ritmi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      <strong>1ª NF:</strong> Retorno de mercadoria (5902) no embarque do caminhão.<br />
                      <strong>2ª NF:</strong> Cobrança da costura (5124) após conferência das peças pela fábrica.
                    </p>
                  </div>

                  {/* Card Conjunto */}
                  <div
                    onClick={() => setModoEmissao("CONJUNTO")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 ${
                      modoEmissao === "CONJUNTO"
                        ? "border-slate-900 bg-slate-50/80 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-slate-700" />
                        Emissão Conjunta (Nota Única)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600">
                        1 Documento
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Gera uma única NF-e contendo a devolução dos insumos (CFOP 5.902) e o serviço de costura (CFOP 5.124) juntos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Contatos Específicos para Notificações Automáticas */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <p className="text-xs font-semibold text-ink">
                  Destinos para Envio do DANFE e XML
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      E-mail da Expedição / Portaria
                    </label>
                    <input
                      type="email"
                      value={emailExpedicao}
                      onChange={(e) => setEmailExpedicao(e.target.value)}
                      placeholder="expedicao@fabrica.com.br"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Recebe a NF de Retorno (5.902) no despacho
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      E-mail do Financeiro / Contas a Pagar
                    </label>
                    <input
                      type="email"
                      value={emailFinanceiro}
                      onChange={(e) => setEmailFinanceiro(e.target.value)}
                      placeholder="financeiro@fabrica.com.br"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Recebe a NF de Cobrança (5.124) faturada
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WhatsApp do Financeiro da Fábrica
                  </label>
                  <input
                    type="text"
                    value={whatsappFinanceiro}
                    onChange={(e) => setWhatsappFinanceiro(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Utilizado para envio direto da cobrança e espelho via WhatsApp
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: MODELO DO ESPELHO DE PRODUÇÃO */}
          {activeTab === "ESPELHO" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Layout do Espelho de Produção
                </label>
                <select
                  value={modeloEspelho}
                  onChange={(e) => setModeloEspelho(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-xs"
                >
                  <option value="RITMI">Ritmi Confecções (Padrão Gênesis)</option>
                  <option value="LANCA_PERFUME">Lança Perfume / La Moda (Padrão Criciúma)</option>
                  <option value="GENERICO">Modelo Genérico / Tabela com OP e Peças</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Define a estrutura que o sistema utiliza para ler as OPs, peças e valores do PDF da fábrica.
                </p>
              </div>

              {/* Upload de Exemplo do Espelho */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-600" />
                    Arquivo de Referência da Fábrica (Opcional)
                  </span>
                  {templateFileName && (
                    <span className="text-[10px] text-slate-700 font-semibold bg-slate-200 px-2 py-0.5 rounded-full">
                      Carregado
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Caso deseje, anexe um PDF de espelho ou nota fiscal anterior desta fábrica para calibrar o leitor.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{templateFileName || "Selecionar PDF de Exemplo"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé e Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
            <div className="text-[11px] text-slate-400">
              Modo ativo: <strong>{modoEmissao === "SEPARADO" ? "Separado (2 Etapas)" : "Conjunto (Nota Única)"}</strong>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{partnerToEdit ? "Salvar Alterações" : "Cadastrar Fábrica"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
