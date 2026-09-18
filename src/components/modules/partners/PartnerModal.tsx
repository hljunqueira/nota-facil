"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
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
    email?: string | null;
    telefone?: string | null;
  } | null;
  onSuccess: (message: string) => void;
}

export function PartnerModal({
  isOpen,
  onClose,
  partnerToEdit,
  onSuccess,
}: PartnerModalProps) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [loading, setLoading] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cnpjSuccessInfo, setCnpjSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    if (partnerToEdit) {
      setRazaoSocial(partnerToEdit.razaoSocial || "");
      setNomeFantasia(partnerToEdit.nomeFantasia || "");
      setCnpj(formatCnpj(partnerToEdit.cnpj || ""));
      setEmail(partnerToEdit.email || "");
      setTelefone(formatPhone(partnerToEdit.telefone || ""));
    } else {
      resetForm();
    }
    setErrorMessage(null);
    setCnpjSuccessInfo(null);
  }, [partnerToEdit, isOpen]);

  const resetForm = () => {
    setRazaoSocial("");
    setNomeFantasia("");
    setCnpj("");
    setEmail("");
    setTelefone("");
  };

  const formatCnpj = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (val: string) => {
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
        email: email || undefined,
        telefone: telefone || undefined,
      });

      if (res.success) {
        onSuccess(res.message || "Fábrica parceira salva com sucesso!");
        onClose();
      } else {
        setErrorMessage(res.error || "Erro ao salvar parceiro.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                {partnerToEdit
                  ? "Editar Fábrica Parceira"
                  : "Cadastrar Nova Fábrica"}
              </h2>
              <p className="text-xs text-slate-500">
                Confecções que enviam remessas de corte para sua oficina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {cnpjSuccessInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cnpjSuccessInfo}</span>
            </div>
          )}

          {/* Campo CNPJ com Botão de Consulta Automática */}
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
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
              />
              <button
                type="button"
                onClick={handleLookupCnpj}
                disabled={searchingCnpj || cnpj.replace(/\D/g, "").length !== 14}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50 cursor-pointer transition-all shrink-0"
                title="Buscar dados cadastrais oficiais na Receita Federal"
              >
                {searchingCnpj ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Preencher Auto</span>
              </button>
            </div>
          </div>

          {/* Razão Social */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Razão Social (Nome Oficial) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Ex: Ritme Confecções e Têxtil S.A."
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            />
          </div>

          {/* Nome Fantasia */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Fantasia / Marca (Como você conhece a fábrica)
            </label>
            <input
              type="text"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Ex: Ritme"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp / Telefone
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
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                />
              </div>
            </div>

            {/* E-mail de Notificação */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail de Recebimento
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
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            * Ao emitir uma nota de devolução (CFOP 5.902), o DANFE e XML serão
            enviados automaticamente para o WhatsApp ou E-mail cadastrado acima.
          </p>

          {/* Rodapé e Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{partnerToEdit ? "Salvar Alterações" : "Cadastrar Fábrica"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
