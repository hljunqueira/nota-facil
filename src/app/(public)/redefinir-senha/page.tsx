"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { validateResetTokenAction, resetPasswordAction } from "@/actions/passwordReset";

function RedefinirSenhaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setTokenValid(false);
        setTokenError("Link de recuperação incompleto ou ausente. Solicite uma nova redefinição.");
        setIsValidating(false);
        return;
      }

      const res = await validateResetTokenAction(token);
      if (res.valid) {
        setTokenValid(true);
        setEmail(res.email || "");
      } else {
        setTokenValid(false);
        setTokenError(res.error || "Link de recuperação inválido ou expirado.");
      }
      setIsValidating(false);
    }

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (novaSenha.length < 6) {
      setFormError("A nova senha deve conter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setFormError("As senhas digitadas não coincidem. Verifique e tente novamente.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await resetPasswordAction(token, novaSenha);
      if (!res.success) {
        setFormError(res.error || "Erro ao redefinir a senha.");
        setSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setFormError("Ocorreu um erro inesperado de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-surface">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Validando link de segurança...</h2>
          <p className="text-xs text-slate-500 mt-1">Aguarde um instante enquanto verificamos seu token.</p>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-surface">
        <section className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md text-center transition-all animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-primary mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-50/60">
            <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Senha Atualizada com Sucesso!
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sua nova senha foi gravada com segurança. Você já pode acessar a plataforma com suas novas credenciais.
          </p>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>Acessar o Painel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!tokenValid) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-surface">
        <section className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md text-center transition-all animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-amber-50/60">
            <AlertCircle className="w-9 h-9" aria-hidden="true" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Link Expirado ou Inválido
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {tokenError || "Este link de recuperação já foi utilizado ou ultrapassou o limite de validade de 1 hora."}
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/recuperar-senha"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span>Solicitar Novo Link</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 py-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para o Login</span>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-surface selection:bg-primary/20 selection:text-primaryDark">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Link
            href="/"
            className="relative w-16 h-16 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center p-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Ir para a Página Inicial"
          >
            <Image
              src="/logoNF.png"
              alt="Nota Fácil"
              width={56}
              height={56}
              className="object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
              priority
            />
          </Link>
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-ink">
          Cadastrar Nova Senha
        </h1>
        {email && (
          <p className="mt-1 text-center text-xs text-slate-500 max-w-xs mx-auto">
            Conta: <strong className="text-slate-700">{email}</strong>
          </p>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {formError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="novaSenha"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nova Senha
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="novaSenha"
                  name="novaSenha"
                  type={showPassword ? "text" : "password"}
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmarSenha"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Confirmar Nova Senha
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Salvando Nova Senha...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar e Salvar Senha</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para o Login</span>
            </Link>
          </div>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Ambiente Seguro • Nota Fácil Cloud • SSL 256-bit
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-surface">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </main>
      }
    >
      <RedefinirSenhaContent />
    </Suspense>
  );
}
