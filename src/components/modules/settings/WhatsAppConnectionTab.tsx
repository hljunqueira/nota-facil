"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  QrCode,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Send,
  Loader2,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  getTenantWhatsAppStatusAction,
  getTenantWhatsAppQrCodeAction,
  disconnectTenantWhatsAppAction,
  sendWhatsAppTestMessageAction,
} from "@/actions/whatsappConnection";

interface WhatsAppConnectionTabProps {
  tenantPhone?: string;
}

export function WhatsAppConnectionTab({ tenantPhone }: WhatsAppConnectionTabProps = {}) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [status, setStatus] = useState<"open" | "close" | "connecting" | string>("close");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [phoneRegistered, setPhoneRegistered] = useState<string | null>(tenantPhone || null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await getTenantWhatsAppStatusAction();
      setStatus(res.state || (res.connected ? "open" : "close"));
      if (res.telefoneContato) {
        setPhoneRegistered(res.telefoneContato);
      }
      return res.state === "open" || res.connected;
    } catch (err) {
      console.error("[checkStatus] Erro:", err);
      return false;
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // Inicia verificação do status ao montar
  useEffect(() => {
    checkStatus();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [checkStatus]);

  // Polling automático enquanto o QR code estiver aberto
  useEffect(() => {
    if (qrCodeBase64 && status !== "open") {
      pollIntervalRef.current = setInterval(async () => {
        const isConnected = await checkStatus();
        if (isConnected) {
          setQrCodeBase64(null);
          setToastMessage("WhatsApp comercial conectado com sucesso!");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
      }, 3000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [qrCodeBase64, status, checkStatus]);

  // Timer regressivo para expiração do QR code (45 segundos)
  useEffect(() => {
    if (qrCodeBase64 && status !== "open") {
      setSecondsRemaining(45);
      timerIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [qrCodeBase64, status]);

  const handleGenerateQr = async () => {
    setLoadingQr(true);
    setErrorMessage(null);
    setQrCodeBase64(null);

    try {
      const res = await getTenantWhatsAppQrCodeAction();
      if (res.success) {
        if (res.state === "open") {
          setStatus("open");
          setToastMessage("WhatsApp já está conectado!");
        } else if (res.base64) {
          setQrCodeBase64(res.base64);
          setStatus("connecting");
        } else {
          setErrorMessage("Servidor gerando QR Code. Tente novamente em alguns segundos.");
        }
      } else {
        setErrorMessage(res.error || "Não foi possível gerar o QR Code.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Falha na comunicação com o servidor WhatsApp.");
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp da sua confecção?")) return;

    setDisconnecting(true);
    setErrorMessage(null);

    try {
      await disconnectTenantWhatsAppAction();
      setStatus("close");
      setQrCodeBase64(null);
      setToastMessage("WhatsApp desconectado com sucesso.");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao desconectar WhatsApp.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setErrorMessage(null);

    try {
      const res = await sendWhatsAppTestMessageAction();
      if (res.success) {
        setToastMessage("Mensagem de teste enviada com sucesso no seu WhatsApp!");
      } else {
        setErrorMessage(res.error || "Não foi possível enviar a mensagem de teste.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao enviar teste.");
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = status === "open";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast de Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
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
            className="text-rose-700 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card Principal de Conexão */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Conexão WhatsApp da Oficina
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Conecte seu WhatsApp comercial para enviar notas fiscais, DANFEs e fechamentos contábeis direto do seu número para clientes e contador.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {loadingStatus ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verificando...</span>
              </span>
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Conectado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Desconectado</span>
              </span>
            )}
          </div>
        </div>

        {/* Cenário 1: WhatsApp Já Conectado */}
        {isConnected && !loadingStatus && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-xs">
                  <h3 className="font-bold text-emerald-950">Seu WhatsApp está pronto para envios!</h3>
                  <p className="text-emerald-800 mt-0.5">
                    Telefone vinculado: <strong>{phoneRegistered || "Configurado"}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  type="button"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar Teste</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  type="button"
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                  title="Desconectar este aparelho"
                >
                  {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 text-rose-500" />}
                  <span>Desconectar</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Envio 100% Automático Ativado</span>
              </div>
              <p className="text-slate-500">
                Ao emitir notas fiscais para parceiros ou gerar o fechamento contábil mensal, o sistema utiliza este WhatsApp para enviar os documentos instantaneamente.
              </p>
            </div>
          </div>
        )}

        {/* Cenário 2: WhatsApp Desconectado / Exibição de QR Code */}
        {!isConnected && !loadingStatus && (
          <div className="space-y-6">
            {!qrCodeBase64 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>

                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-900">
                    Conectar o WhatsApp da Oficina
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Clique no botão abaixo para gerar o QR Code. Em seguida, escaneie com seu WhatsApp pelo celular no menu <strong>Aparelhos Conectados</strong>.
                  </p>
                </div>

                <button
                  onClick={handleGenerateQr}
                  disabled={loadingQr}
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {loadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  <span>{loadingQr ? "Gerando QR Code..." : "Conectar meu WhatsApp"}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center shrink-0">
                  {secondsRemaining > 0 ? (
                    <img
                      src={qrCodeBase64.startsWith("data:") ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code WhatsApp"
                      className="w-52 h-52 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-400 space-y-2 bg-slate-50 rounded-lg">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <span className="text-xs font-medium text-slate-600">QR Code expirado</span>
                    </div>
                  )}

                  <div className="mt-3 text-[11px] text-slate-500">
                    {secondsRemaining > 0 ? (
                      <span className="text-slate-600">
                        Expira em: <strong className="text-slate-900 font-mono">{secondsRemaining}s</strong>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-medium">Tempo esgotado</span>
                    )}
                  </div>

                  <button
                    onClick={handleGenerateQr}
                    disabled={loadingQr}
                    type="button"
                    className="mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingQr ? "animate-spin" : ""}`} />
                    <span>Atualizar QR Code</span>
                  </button>
                </div>

                {/* Passo a Passo */}
                <div className="space-y-4 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Como conectar pelo seu celular:
                  </h4>

                  <ol className="space-y-3 list-decimal list-inside text-slate-600">
                    <li className="leading-relaxed">
                      Abra o aplicativo do <strong>WhatsApp</strong> no seu smartphone.
                    </li>
                    <li className="leading-relaxed">
                      Toque em <strong>Configurações</strong> (no iPhone) ou nos <strong>três pontinhos</strong> (no Android).
                    </li>
                    <li className="leading-relaxed">
                      Selecione <strong>Aparelhos conectados</strong> e depois toque em <strong>Conectar um aparelho</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Aponte a câmera do seu celular para este <strong>QR Code</strong> ao lado.
                    </li>
                  </ol>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200/70 text-[11px] text-emerald-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Aguardando leitura do código pelo seu celular...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dúvidas Frequentes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs text-slate-600">
        <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span>Perguntas Frequentes sobre a Conexão</span>
        </h3>

        <div className="space-y-2 text-slate-600">
          <div>
            <span className="font-semibold text-slate-800 block">Preciso deixar o celular conectado à internet?</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Não. O WhatsApp com múltiplos aparelhos funciona independentemente de o seu celular estar ligado ou com internet ativa.
            </p>
          </div>

          <div>
            <span className="font-semibold text-slate-800 block">Posso desconectar quando quiser?</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sim. Você pode desconectar a qualquer momento pelo botão "Desconectar" nesta tela ou diretamente pelo app do WhatsApp no seu smartphone em "Aparelhos Conectados".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
