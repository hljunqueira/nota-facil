"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

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
        setErrorMessage("Credenciais administrativas incorretas ou acesso não autorizado.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage("Erro ao conectar com o servidor administrativo.");
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="admin-email"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          E-mail ou Usuário do Administrador
        </label>
        <div className="relative rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            id="admin-email"
            name="email"
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="henrique ou admin@appnotafacil.online"
            className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all duration-200"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="admin-password"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          Senha Master
        </label>
        <div className="relative rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="block w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all duration-200"
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
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-slate-900 hover:bg-black font-semibold text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Validando Acesso Master...</span>
            </>
          ) : (
            <>
              <span>Acessar Painel Master</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-900 selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center p-3 shadow-lg">
            <Image
              src="/logoNF.png"
              alt="Nota Fácil Admin"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Área Restrita do Administrador</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Nota Fácil Master
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Controle central de empresas, certificados e emissões fiscais
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-200">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              </div>
            }
          >
            <AdminLoginForm />
          </Suspense>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Acesso auditado por IP e timestamp • Proteção TLS 1.3
          </p>
        </footer>
      </div>
    </main>
  );
}
