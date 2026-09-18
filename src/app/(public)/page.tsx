import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-primary/20 selection:text-primaryDark">
      {/* Topo / Barra de Navegação Acessível e Semântica */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all">
        <nav
          aria-label="Navegação Principal"
          className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
        >
          {/* Logo & Marca (LCP otimizado com priority e dimensões explícitas para zero CLS) */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            aria-label="Nota Fácil - Página Inicial"
          >
            <div className="relative w-8 h-8 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none">
              <Image
                src="/logoNF.png"
                alt="Nota Fácil Logotipo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                Nota Fácil
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                Emissão de NF Descomplicada
              </span>
            </div>
          </Link>

          {/* Ações de Navegação */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
              aria-label="Acessar conta existente"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primaryDark rounded-xl shadow-xs transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Criar nova conta de empresa"
            >
              Começar Agora
            </Link>
          </div>
        </nav>
      </header>

      {/* Conteúdo Principal com Seções Semânticas */}
      <main className="flex-1">
        {/* Hero Section */}
        <section
          aria-labelledby="hero-title"
          className="py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto text-center"
        >
          {/* Badge Informativo de Posicionamento */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold tracking-wide shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
            <span>Emissão de NF Descomplicada para Empresas e Prestadores</span>
          </div>

          <h1
            id="hero-title"
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-tight"
          >
            Emissão de NF descomplicada e retorno fiscal em 1 clique
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Elimine a burocracia tributária. Emita notas fiscais, gerencie retornos de mercadorias
            e industrialização, envie DANFE e XML automaticamente para seus clientes e consolide o
            fechamento contábil mensal sem perder tempo.
          </p>

          {/* Chamadas para Ação (CTAs) */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-950 hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-xs transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Acessar Minha Conta
            </Link>
            <Link
              href="/cadastro"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold shadow-xs transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Cadastrar Minha Empresa
            </Link>
          </div>
        </section>

        {/* 3 Blocos de Funcionamento (Cards Sóbrios com Micro-Interações Suaves) */}
        <section
          aria-labelledby="fluxo-title"
          className="py-14 bg-white border-y border-slate-200"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2
                id="fluxo-title"
                className="text-xl sm:text-2xl font-bold text-slate-900"
              >
                Como funciona o fluxo operacional
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                Processos diretos e objetivos para faturar com segurança e rapidez
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <article className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none group">
                <span className="text-xs font-bold text-primaryDark uppercase tracking-wider">
                  Passo 1
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-primaryDark transition-colors">
                  Emissão & Inversão em 1 Clique
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Importe arquivos XML ou sincronize diretamente pela SEFAZ. O sistema calcula
                  automaticamente impostos, CFOPs de retorno e devolução sem exigir conhecimentos
                  tributários avançados.
                </p>
              </article>

              {/* Card 2 */}
              <article className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none group">
                <span className="text-xs font-bold text-primaryDark uppercase tracking-wider">
                  Passo 2
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-primaryDark transition-colors">
                  Envio Direto ao Cliente
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Assim que a nota fiscal é autorizada pela Receita Estadual, o DANFE em PDF e o
                  arquivo XML são disparados automaticamente via WhatsApp e E-mail para seus
                  parceiros comerciais.
                </p>
              </article>

              {/* Card 3 */}
              <article className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none group">
                <span className="text-xs font-bold text-primaryDark uppercase tracking-wider">
                  Passo 3
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2 group-hover:text-primaryDark transition-colors">
                  Fechamento do Contador
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  No encerramento de cada mês, empacote todos os arquivos XMLs e DANFEs emitidos e
                  recebidos em um arquivo .ZIP estruturado e envie para a sua contabilidade em um
                  único clique.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Recursos em Destaque (Card Corporativo Sóbrio) */}
        <section
          aria-labelledby="recursos-title"
          className="py-14 px-4 sm:px-6 max-w-4xl mx-auto"
        >
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-sm relative overflow-hidden">
            <h2
              id="recursos-title"
              className="text-xl sm:text-2xl font-bold tracking-tight"
            >
              Desenvolvido para simplificar a rotina da sua empresa
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Tudo o que seu negócio precisa para manter conformidade fiscal, emitir notas em
              segundos e manter uma comunicação profissional com clientes e contadores.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true"></span>
                <span>Cálculo automático Simples Nacional e MEI</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true"></span>
                <span>Compatível com celular (PWA) e computador</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true"></span>
                <span>Certificado digital A1 com proteção e criptografia</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true"></span>
                <span>Histórico consolidado e relatórios mensais</span>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                Já tem cadastro na plataforma?
              </span>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs sm:text-sm font-bold transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Entrar no Sistema
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé Semântico */}
      <footer className="w-full bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">Nota Fácil</span> • Emissão de NF descomplicada e gestão fiscal moderna.
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
