"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        senha: password,
        password,
      });

      if (!res || res.error) {
        if (res?.error === "CADASTRO_EM_ANALISE") {
          setErrorMessage(
            "Seu cadastro está em análise pela equipe administrativa. Nossa equipe entrará em contato via WhatsApp e e-mail assim que sua conta for ativada."
          );
        } else if (res?.error === "CONTA_ADMINISTRADOR_NO_CLIENTE") {
          setErrorMessage(
            "Esta conta é de Administrador da Plataforma. Para gerenciar o sistema, acesse o portal administrativo em admin.appnotafacil.online."
          );
        } else if (res?.error?.startsWith("CADASTRO_REJEITADO")) {
          const motivo = res.error.includes(":") ? res.error.split(":")[1] : "";
          setErrorMessage(
            `Cadastro não aprovado${motivo ? `: ${motivo}` : ""}. Entre em contato com o suporte para regularizar seus dados.`
          );
        } else if (res?.error === "CONTA_SUSPENSA" || res?.error === "CONTA_SUSPENSA_ADMIN") {
          setErrorMessage("Sua conta possui bloqueio administrativo. Entre em contato com o suporte da plataforma.");
        } else if (res?.error === "CredentialsSignin") {
          setErrorMessage("E-mail ou senha incorretos. Verifique suas credenciais.");
        } else {
          setErrorMessage(res?.error || "Erro ao efetuar login. Verifique suas credenciais.");
        }
        setLoading(false);
        return;
      }

      // Route to callback or dashboard
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage("Ocorreu um erro inesperado ao conectar ao servidor.");
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          E-mail Corporativo
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
            placeholder="suaempresa@exemplo.com"
            className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700"
          >
            Senha de Acesso
          </label>
          <Link
            href="/recuperar-senha"
            className="text-xs font-semibold text-primary hover:text-primaryDark transition-colors focus-visible:outline-none focus-visible:underline"
          >
            Esqueceu sua senha?
          </Link>
        </div>
        <div className="relative rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="block w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-primary hover:bg-primaryDark font-semibold text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <span>Entrar no Sistema</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
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
          Nota Fácil
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Emissão de NF descomplicada em 1 clique
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Sua empresa ainda não tem conta?{" "}
              <Link
                href="/cadastro"
                className="font-semibold text-primary hover:text-primaryDark transition-colors focus-visible:outline-none focus-visible:underline"
              >
                Cadastrar agora
              </Link>
            </p>
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
