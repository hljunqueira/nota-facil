"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Lock,
  Mail,
  Phone,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  FileBadge,
  Sparkles,
} from "lucide-react";
import { registerTenantAction } from "@/actions/register";
import { isValidCNPJ } from "@/lib/validations";

export default function CadastroPage() {
  // Controle de Etapa (1: Dados da Empresa, 2: Responsável e Acesso)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState({
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    inscricaoEstadual: "",
    responsavelNome: "",
    telefoneContato: "",
    emailPrincipal: "",
    senha: "",
    confirmarSenha: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [cnpjSuccessMessage, setCnpjSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Formata CNPJ enquanto digita: 00.000.000/0000-00
  const formatCNPJ = (val: string) => {
    const numbers = val.replace(/\D/g, "").slice(0, 14);
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  // Formata Telefone: (00) 00000-0000
  const formatTelefone = (val: string) => {
    const numbers = val.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData((prev) => ({ ...prev, cnpj: formatted }));
    setCnpjSuccessMessage(null);

    // Se atingiu 14 dígitos válidos, faz a busca automática
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 14) {
      handleLookupCnpj(clean);
    }
  };

  const handleLookupCnpj = async (cnpjToSearch?: string) => {
    const clean = (cnpjToSearch || formData.cnpj).replace(/\D/g, "");
    if (clean.length !== 14) {
      setFieldErrors((prev) => ({ ...prev, cnpj: "Informe o CNPJ completo com 14 dígitos" }));
      return;
    }

    if (!isValidCNPJ(clean)) {
      setFieldErrors((prev) => ({ ...prev, cnpj: "CNPJ inválido (dígitos verificadores incorretos)" }));
      return;
    }

    setSearchingCnpj(true);
    setCnpjSuccessMessage(null);
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy.cnpj;
      return copy;
    });

    try {
      const res = await fetch(`/api/cnpj/${clean}`);
      const data = await res.json();

      if (res.ok) {
        setFormData((prev) => ({
          ...prev,
          razaoSocial: data.razaoSocial || prev.razaoSocial,
          nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
          telefoneContato: data.telefone ? formatTelefone(data.telefone) : prev.telefoneContato,
          emailPrincipal: data.email || prev.emailPrincipal,
        }));
        setCnpjSuccessMessage("Dados da empresa sincronizados com a Receita Federal!");
      } else {
        setCnpjSuccessMessage("Consulta automática indisponível. Preencha os campos abaixo.");
      }
    } catch {
      setCnpjSuccessMessage("Consulta automática indisponível. Preencha manualmente.");
    } finally {
      setSearchingCnpj(false);
    }
  };

  // Validação da Etapa 1 antes de avançar para a Etapa 2
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    const cleanCnpj = formData.cnpj.replace(/\D/g, "");

    if (!formData.cnpj || cleanCnpj.length !== 14) {
      errors.cnpj = "Informe o CNPJ completo";
    } else if (!isValidCNPJ(cleanCnpj)) {
      errors.cnpj = "CNPJ inválido";
    }

    if (!formData.razaoSocial.trim()) {
      errors.razaoSocial = "Informe a Razão Social da empresa";
    }

    if (!formData.inscricaoEstadual.trim()) {
      errors.inscricaoEstadual = "Informe a Inscrição Estadual ou digite ISENTO";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setErrorMessage(null);
      setCurrentStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Validações da Etapa 2
    const errors: Record<string, string> = {};
    if (!formData.responsavelNome.trim()) {
      errors.responsavelNome = "Informe o nome do responsável";
    }
    if (!formData.telefoneContato.trim() || formData.telefoneContato.replace(/\D/g, "").length < 10) {
      errors.telefoneContato = "Informe um telefone/WhatsApp válido";
    }
    if (!formData.emailPrincipal.trim() || !formData.emailPrincipal.includes("@")) {
      errors.emailPrincipal = "Informe um e-mail válido";
    }
    if (!formData.senha || formData.senha.length < 8) {
      errors.senha = "A senha deve conter no mínimo 8 dígitos";
    }
    if (formData.senha !== formData.confirmarSenha) {
      errors.confirmarSenha = "As senhas digitadas não coincidem";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const result = await registerTenantAction({
        razaoSocial: formData.razaoSocial,
        nomeFantasia: formData.nomeFantasia || undefined,
        cnpj: formData.cnpj,
        inscricaoEstadual: formData.inscricaoEstadual,
        responsavelNome: formData.responsavelNome,
        telefoneContato: formData.telefoneContato,
        emailPrincipal: formData.emailPrincipal,
        senha: formData.senha,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Ocorreu um erro ao processar seu cadastro.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          // Se o erro pertencer à etapa 1 (ex: CNPJ duplicado), volta para a etapa 1
          if (result.fieldErrors.cnpj || result.fieldErrors.razaoSocial) {
            setCurrentStep(1);
          }
        }
        setSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("Erro inesperado de conexão. Tente novamente mais tarde.");
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/80 selection:bg-primary/20 selection:text-primaryDark">
        <section
          aria-labelledby="sucesso-title"
          className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl text-center transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-primary mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-50/60">
            <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
          </div>
          <h1 id="sucesso-title" className="text-2xl font-bold text-slate-900 tracking-tight">
            Cadastro Concluído!
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-primaryDark mt-1.5 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            <span>Aguardando Ativação pela Equipe</span>
          </p>

          <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Empresa:</span>
              <strong className="text-slate-900 text-right truncate max-w-[200px]">{formData.razaoSocial}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">CNPJ:</span>
              <strong className="text-slate-900">{formData.cnpj}</strong>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">E-mail:</span>
              <strong className="text-slate-900">{formData.emailPrincipal}</strong>
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-500 leading-relaxed">
            Sua empresa foi cadastrada com sucesso. Nossa equipe administrativa validará a documentação e enviará uma notificação para liberação imediata da emissão de notas fiscais.
          </p>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>Ir para a Página de Login</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-100/70 selection:bg-primary/20 selection:text-primaryDark">
      <div className="max-w-xl mx-auto">
        {/* Cabeçalho Compacto & Moderno */}
        <header className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center mb-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
            aria-label="Voltar para a Página Inicial"
          >
            <div className="relative w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center p-2 transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none">
              <Image
                src="/logoNF.png"
                alt="Nota Fácil"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cadastre sua Empresa
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Emissão de NF descomplicada, retornos fiscais e fechamento em 1 clique
          </p>
        </header>

        {/* Indicador Visual de Etapas (Stepper Elegante) */}
        <nav aria-label="Progresso do Cadastro" className="mb-6">
          <div className="flex items-center justify-between relative max-w-sm mx-auto">
            {/* Linha Conectora */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
            <div
              className={`absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-in-out ${
                currentStep === 1 ? "w-1/2" : "w-full"
              }`}
            />

            {/* Passo 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus-visible:outline-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  currentStep === 1
                    ? "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-semibold transition-colors ${
                  currentStep === 1 ? "text-slate-900" : "text-slate-500"
                }`}
              >
                Dados da Empresa
              </span>
            </button>

            {/* Passo 2 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="relative z-10 flex flex-col items-center group cursor-pointer focus-visible:outline-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  currentStep === 2
                    ? "bg-primary text-white ring-4 ring-primary/20 shadow-xs"
                    : "bg-white border-2 border-slate-300 text-slate-500"
                }`}
              >
                2
              </div>
              <span
                className={`text-[11px] mt-1.5 font-semibold transition-colors ${
                  currentStep === 2 ? "text-slate-900" : "text-slate-500"
                }`}
              >
                Responsável & Senha
              </span>
            </button>
          </div>
        </nav>

        {/* Card Principal do Formulário */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md shadow-slate-200/40 relative">
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* ETAPA 1: DADOS FISCAIS DA EMPRESA */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      1. Informações Fiscais da Empresa
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Etapa 1 de 2
                  </span>
                </div>

                {/* CNPJ com Consulta Rápida */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="cnpj"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      CNPJ da Empresa <span className="text-primary">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Busca automática na Receita</span>
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="cnpj"
                      name="cnpj"
                      type="text"
                      inputMode="numeric"
                      required
                      value={formData.cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                      className={`block w-full pl-10 pr-24 py-2.5 bg-slate-50/70 border ${
                        fieldErrors.cnpj
                          ? "border-red-400 focus:ring-red-200"
                          : "border-slate-300 focus:ring-primary/20 focus:border-primary"
                      } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => handleLookupCnpj()}
                      disabled={searchingCnpj || formData.cnpj.replace(/\D/g, "").length !== 14}
                      className="absolute right-1.5 px-3 py-1.5 bg-slate-200/80 hover:bg-primary hover:text-white disabled:opacity-40 disabled:hover:bg-slate-200/80 disabled:hover:text-slate-600 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Buscar dados do CNPJ na Receita Federal"
                    >
                      {searchingCnpj ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3 h-3" />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {fieldErrors.cnpj && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.cnpj}</p>
                  )}
                  {cnpjSuccessMessage && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{cnpjSuccessMessage}</span>
                    </div>
                  )}
                </div>

                {/* Razão Social */}
                <div>
                  <label
                    htmlFor="razaoSocial"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Razão Social Oficial <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FileBadge className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="razaoSocial"
                      name="razaoSocial"
                      type="text"
                      required
                      value={formData.razaoSocial}
                      onChange={(e) =>
                        setFormData({ ...formData, razaoSocial: e.target.value })
                      }
                      placeholder="Ex: Comercial & Serviços de Costura Ltda"
                      className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border ${
                        fieldErrors.razaoSocial ? "border-red-400" : "border-slate-300"
                      } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                    />
                  </div>
                  {fieldErrors.razaoSocial && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {fieldErrors.razaoSocial}
                    </p>
                  )}
                </div>

                {/* Nome Fantasia e Inscrição Estadual lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome Fantasia */}
                  <div>
                    <label
                      htmlFor="nomeFantasia"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Nome Fantasia <span className="text-slate-400 text-[10px] font-normal">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="nomeFantasia"
                        name="nomeFantasia"
                        type="text"
                        value={formData.nomeFantasia}
                        onChange={(e) =>
                          setFormData({ ...formData, nomeFantasia: e.target.value })
                        }
                        placeholder="Ex: Minha Oficina / Empresa"
                        className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* Inscrição Estadual */}
                  <div>
                    <label
                      htmlFor="inscricaoEstadual"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Inscrição Estadual (IE) <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="inscricaoEstadual"
                        name="inscricaoEstadual"
                        type="text"
                        required
                        value={formData.inscricaoEstadual}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            inscricaoEstadual: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="Ex: 123456789 ou ISENTO"
                        className={`block w-full px-3.5 py-2.5 bg-slate-50/70 border ${
                          fieldErrors.inscricaoEstadual ? "border-red-400" : "border-slate-300"
                        } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                      />
                    </div>
                    {fieldErrors.inscricaoEstadual && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {fieldErrors.inscricaoEstadual}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botão de Avanço da Etapa 1 */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <span>Continuar para Dados de Acesso</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: RESPONSÁVEL E CREDENCIAIS DE ACESSO */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" aria-hidden="true" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      2. Titular e Credenciais de Acesso
                    </h2>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Etapa 2 de 2
                  </span>
                </div>

                {/* Nome do Responsável */}
                <div>
                  <label
                    htmlFor="responsavelNome"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nome Completo do Titular <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="responsavelNome"
                      name="responsavelNome"
                      type="text"
                      required
                      value={formData.responsavelNome}
                      onChange={(e) =>
                        setFormData({ ...formData, responsavelNome: e.target.value })
                      }
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border ${
                        fieldErrors.responsavelNome ? "border-red-400" : "border-slate-300"
                      } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                    />
                  </div>
                  {fieldErrors.responsavelNome && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {fieldErrors.responsavelNome}
                    </p>
                  )}
                </div>

                {/* Telefone e E-mail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Telefone / WhatsApp */}
                  <div>
                    <label
                      htmlFor="telefoneContato"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Telefone / WhatsApp <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="telefoneContato"
                        name="telefoneContato"
                        type="tel"
                        required
                        value={formData.telefoneContato}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            telefoneContato: formatTelefone(e.target.value),
                          })
                        }
                        placeholder="(00) 00000-0000"
                        className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border ${
                          fieldErrors.telefoneContato ? "border-red-400" : "border-slate-300"
                        } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                      />
                    </div>
                    {fieldErrors.telefoneContato && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {fieldErrors.telefoneContato}
                      </p>
                    )}
                  </div>

                  {/* E-mail Principal */}
                  <div>
                    <label
                      htmlFor="emailPrincipal"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      E-mail de Login <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="emailPrincipal"
                        name="emailPrincipal"
                        type="email"
                        required
                        value={formData.emailPrincipal}
                        onChange={(e) =>
                          setFormData({ ...formData, emailPrincipal: e.target.value })
                        }
                        placeholder="empresa@exemplo.com"
                        className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border ${
                          fieldErrors.emailPrincipal ? "border-red-400" : "border-slate-300"
                        } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                      />
                    </div>
                    {fieldErrors.emailPrincipal && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {fieldErrors.emailPrincipal}
                      </p>
                    )}
                  </div>
                </div>

                {/* Senha e Confirmação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Senha */}
                  <div>
                    <label
                      htmlFor="senha"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Senha (Mín. 8 caracteres) <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="senha"
                        name="senha"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.senha}
                        onChange={(e) =>
                          setFormData({ ...formData, senha: e.target.value })
                        }
                        placeholder="••••••••"
                        className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border ${
                          fieldErrors.senha ? "border-red-400" : "border-slate-300"
                        } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus-visible:outline-none"
                        aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.senha && (
                      <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.senha}</p>
                    )}
                  </div>

                  {/* Confirmar Senha */}
                  <div>
                    <label
                      htmlFor="confirmarSenha"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Confirmar Senha <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <input
                        id="confirmarSenha"
                        name="confirmarSenha"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.confirmarSenha}
                        onChange={(e) =>
                          setFormData({ ...formData, confirmarSenha: e.target.value })
                        }
                        placeholder="••••••••"
                        className={`block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border ${
                          fieldErrors.confirmarSenha ? "border-red-400" : "border-slate-300"
                        } rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all`}
                      />
                    </div>
                    {fieldErrors.confirmarSenha && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        {fieldErrors.confirmarSenha}
                      </p>
                    )}
                  </div>
                </div>

                {/* Box de Segurança Reassurance */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    O certificado digital A1 (.pfx) não é exigido agora. Ele será configurado no painel após a ativação da conta.
                  </span>
                </div>

                {/* Botões de Ação da Etapa 2 */}
                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-1/3 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Criando Conta...</span>
                      </>
                    ) : (
                      <>
                        <span>Finalizar Cadastro</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Rodapé Interno do Card */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Já possui uma conta ativa?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primaryDark transition-colors focus-visible:outline-none focus-visible:underline"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé Externo de Confiança */}
        <footer className="mt-6 text-center">
          <p className="text-[11px] text-slate-400">
            Nota Fácil SaaS B2B • Emissão de NF Descomplicada • Criptografia e Proteção SSL 256-bit
          </p>
        </footer>
      </div>
    </main>
  );
}
