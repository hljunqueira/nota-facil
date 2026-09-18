"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Server,
  ShieldCheck,
  Clock,
  Building2,
  Mail,
  Phone,
  User,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getPendingTenantsAction, approveTenantAction } from "@/actions/admin";
import { RejectModal } from "@/components/modules/admin/RejectModal";
import { RegisterFocusModal } from "@/components/modules/admin/RegisterFocusModal";
import { UploadCertificateModal } from "@/components/modules/admin/UploadCertificateModal";

export default function AprovacoesPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [selectedRejectTenant, setSelectedRejectTenant] = useState<any | null>(null);
  const [selectedFocusTenant, setSelectedFocusTenant] = useState<any | null>(null);
  const [selectedCertTenant, setSelectedCertTenant] = useState<any | null>(null);

  const loadPendingTenants = async () => {
    setLoading(true);
    try {
      const data = await getPendingTenantsAction();
      setTenants(data);
    } catch (err) {
      console.error("Erro ao carregar cadastros pendentes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTenants();
  }, []);

  const handleApprove = async (tenantId: string) => {
    setActionLoading(tenantId);
    setToastMessage(null);
    try {
      const res = await approveTenantAction(tenantId);
      if (res.success) {
        setToastMessage("Cadastro aprovado com sucesso! Agora você pode registrar a empresa na Focus NFe.");
        loadPendingTenants();
      } else {
        alert(res.error || "Erro ao aprovar cadastro.");
      }
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>Fila de Aprovação de Oficinas</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {tenants.length} pendentes
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analise os dados fiscais de novas confecções antes de liberar o acesso e emitir notas
          </p>
        </div>

        <button
          onClick={loadPendingTenants}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar Fila</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 font-bold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Carregando cadastros...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">Fila de aprovação limpa!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Nenhuma nova oficina está aguardando auditoria no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-ink">
                      {tenant.razaoSocial}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                      Pendente Análise
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fantasia: {tenant.nomeFantasia || "Não informado"} • Cadastrado em:{" "}
                    {new Date(tenant.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Ações Primárias */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedRejectTenant(tenant)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Rejeitar</span>
                  </button>

                  <button
                    onClick={() => handleApprove(tenant.id)}
                    disabled={actionLoading === tenant.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    {actionLoading === tenant.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Aprovar Cadastro</span>
                  </button>

                  {!tenant.focusNfeIdEmpresa ? (
                    <button
                      onClick={() => setSelectedFocusTenant(tenant)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>Registrar Focus NFe</span>
                    </button>
                  ) : !tenant.certificadoValidoAte ? (
                    <button
                      onClick={() => setSelectedCertTenant(tenant)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Instalar Certificado A1</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Informações Fiscais e de Contato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    CNPJ
                  </span>
                  <p className="font-mono font-bold text-ink mt-0.5">{tenant.cnpj}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    Inscrição Estadual
                  </span>
                  <p className="font-mono font-bold text-ink mt-0.5">
                    {tenant.inscricaoEstadual}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    Responsável / Contato
                  </span>
                  <p className="font-semibold text-ink mt-0.5">
                    {tenant.users?.[0]?.nome || "Usuário Inicial"}
                  </p>
                  <p className="text-slate-500 text-[11px] truncate">
                    {tenant.telefoneContato}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    E-mail do Gestor
                  </span>
                  <p className="font-semibold text-ink mt-0.5 truncate">
                    {tenant.emailPrincipal}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais */}
      <RejectModal
        tenant={selectedRejectTenant}
        isOpen={!!selectedRejectTenant}
        onClose={() => setSelectedRejectTenant(null)}
        onSuccess={() => {
          setToastMessage("Cadastro rejeitado com sucesso.");
          loadPendingTenants();
        }}
      />

      <RegisterFocusModal
        tenant={selectedFocusTenant}
        isOpen={!!selectedFocusTenant}
        onClose={() => setSelectedFocusTenant(null)}
        onSuccess={(focusId) => {
          setToastMessage(`Empresa registrada na Focus NFe com ID ${focusId}!`);
          loadPendingTenants();
        }}
      />

      <UploadCertificateModal
        tenant={selectedCertTenant}
        isOpen={!!selectedCertTenant}
        onClose={() => setSelectedCertTenant(null)}
        onSuccess={(validoAte) => {
          setToastMessage(`Certificado A1 instalado com sucesso! Validade: ${validoAte || "Registrado"}`);
          loadPendingTenants();
        }}
      />
    </div>
  );
}
