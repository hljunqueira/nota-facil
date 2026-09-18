"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction } from "@/actions/passwordReset";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await requestPasswordResetAction(email);
      if (!res.success) {
        setErrorMessage(res.error || "Erro ao processar recuperação de senha.");
        setLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("Erro inesperado de conexão. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-surface selection:bg-primary/20 selection:text-primaryDark">
        <section
          aria-labelledby="sucesso-recuperacao-title"
          className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md text-center transition-all animate-fadeIn"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-primary mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-50/60">
            <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
          </div>

          <h1 id="sucesso-recuperacao-title" className="text-2xl font-bold text-slate-900 tracking-tight">
            Instruções Enviadas!
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Se o e-mail <strong className="text-slate-900">{email}</strong> estiver cadastrado em nossa plataforma,
            você receberá as orientações e o link seguro para cadastrar sua nova senha.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            Verifique também sua caixa de spam ou lixo eletrônico.
          </p>

          <div className="mt-6">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowLeft className="w-4 h-4" />
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
          Recuperar Senha
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
          Informe seu e-mail cadastrado para redefinir sua senha de acesso
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                E-mail Cadastrado
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@exemplo.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Enviando Instruções...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Link de Recuperação</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:underline"
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
