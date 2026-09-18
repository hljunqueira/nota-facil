"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  Building2,
  ShieldCheck,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Loader2,
  RefreshCw,
  ExternalLink,
  KeyRound,
} from "lucide-react";
import { getAllTenantsAction, toggleFiscalEnvironmentAction } from "@/actions/admin";
import { UploadCertificateModal } from "@/components/modules/admin/UploadCertificateModal";
import { RegisterFocusModal } from "@/components/modules/admin/RegisterFocusModal";
import { ResetPasswordModal } from "@/components/modules/admin/ResetPasswordModal";
import { EditTenantTokensModal } from "@/components/modules/admin/EditTenantTokensModal";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedCertTenant, setSelectedCertTenant] = useState<any | null>(null);
  const [selectedFocusTenant, setSelectedFocusTenant] = useState<any | null>(null);
  const [selectedResetTenant, setSelectedResetTenant] = useState<any | null>(null);
  const [selectedResetUser, setSelectedResetUser] = useState<any | null>(null);
  const [selectedTokenTenant, setSelectedTokenTenant] = useState<any | null>(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await getAllTenantsAction(search, statusFilter);
      setTenants(data);
    } catch (err) {
      console.error("Erro ao carregar oficinas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTenants();
  };

  const handleToggleEnvironment = async (tenantId: string, current: string) => {
    const nextEnv = current === "PRODUCAO" ? "HOMOLOGACAO" : "PRODUCAO";
    try {
      const res = await toggleFiscalEnvironmentAction(tenantId, nextEnv);
      if (res.success) {
        setToastMessage(`Ambiente fiscal alterado para ${nextEnv}!`);
        loadTenants();
      }
    } catch {
      alert("Erro ao alterar ambiente fiscal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Gestão de Oficinas & Confecções
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visualização multi-tenant de todas as contas, certificados A1 e status fiscal
          </p>
        </div>

        <button
          onClick={loadTenants}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Recarregar</span>
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

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ ou E-mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE_ANALISE">Pendente Análise</option>
            <option value="APROVADO">Aprovados</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Carregando lista de oficinas...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">Nenhuma oficina encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Nenhum registro corresponde aos critérios de pesquisa informados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Oficina / Razão Social</th>
                  <th className="py-3.5 px-4">CNPJ & IE</th>
                  <th className="py-3.5 px-4">Status Cadastro</th>
                  <th className="py-3.5 px-4">Ambiente Fiscal</th>
                  <th className="py-3.5 px-4">Focus NFe & Tokens</th>
                  <th className="py-3.5 px-4">Certificado A1</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-ink">{t.razaoSocial}</div>
                      <div className="text-[11px] text-slate-400">
                        {t.nomeFantasia || t.emailPrincipal}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div>{t.cnpj}</div>
                      <div className="text-slate-400">IE: {t.inscricaoEstadual}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {t.statusCadastro === "APROVADO" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Aprovado
                        </span>
                      ) : t.statusCadastro === "PENDENTE_ANALISE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pendente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                          Rejeitado
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleEnvironment(t.id, t.ambiente)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          t.ambiente === "PRODUCAO"
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                        }`}
                        title="Clique para alternar entre Homologação e Produção"
                      >
                        {t.ambiente}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-500">ID:</span>
                          <span className="font-mono text-[11px] font-bold text-slate-700">
                            {t.focusNfeIdEmpresa ? `#${t.focusNfeIdEmpresa}` : <span className="text-slate-400 font-normal">Pendente</span>}
                          </span>
                        </div>
                        {t.focusNfeTokenProducao && (
                          <div className="flex items-center gap-1 text-[10px]" title={`Token Produção: ${t.focusNfeTokenProducao}`}>
                            <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">PROD</span>
                            <span className="font-mono text-slate-600">
                              {t.focusNfeTokenProducao.slice(0, 4)}...{t.focusNfeTokenProducao.slice(-4)}
                            </span>
                          </div>
                        )}
                        {t.focusNfeTokenHomologacao && (
                          <div className="flex items-center gap-1 text-[10px]" title={`Token Homologação: ${t.focusNfeTokenHomologacao}`}>
                            <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[9px]">HOMO</span>
                            <span className="font-mono text-slate-600">
                              {t.focusNfeTokenHomologacao.slice(0, 4)}...{t.focusNfeTokenHomologacao.slice(-4)}
                            </span>
                          </div>
                        )}
                        {!t.focusNfeTokenProducao && !t.focusNfeTokenHomologacao && (
                          <span className="text-[10px] text-slate-400 italic">Token Padrão</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {t.certificadoValidoAte ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Válido até{" "}
                            {new Date(t.certificadoValidoAte).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedCertTenant(t)}
                          disabled={!t.focusNfeIdEmpresa}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primaryDark disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{t.focusNfeIdEmpresa ? "Instalar A1" : "Sem Focus ID"}</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.users && t.users.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedResetTenant(t);
                              setSelectedResetUser(t.users[0]);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                            title={`Redefinir senha (${t.users[0].email})`}
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Senha</span>
                          </button>
                        )}
                        {!t.focusNfeIdEmpresa && (
                          <button
                            onClick={() => setSelectedFocusTenant(t)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Registrar Focus
                          </button>
                        )}
                        {t.focusNfeIdEmpresa && (
                          <button
                            onClick={() => setSelectedCertTenant(t)}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Atualizar A1
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTokenTenant(t)}
                          className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          title="Gerenciar tokens da Focus NFe deste cliente"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Tokens</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UploadCertificateModal
        tenant={selectedCertTenant}
        isOpen={!!selectedCertTenant}
        onClose={() => setSelectedCertTenant(null)}
        onSuccess={(validoAte) => {
          setToastMessage(`Certificado A1 atualizado com sucesso! Validade: ${validoAte || "Registrado"}`);
          loadTenants();
        }}
      />

      <RegisterFocusModal
        tenant={selectedFocusTenant}
        isOpen={!!selectedFocusTenant}
        onClose={() => setSelectedFocusTenant(null)}
        onSuccess={(focusId) => {
          setToastMessage(`Oficina registrada na Focus NFe com ID ${focusId}!`);
          loadTenants();
        }}
      />

      {selectedResetTenant && selectedResetUser && (
        <ResetPasswordModal
          tenant={selectedResetTenant}
          user={selectedResetUser}
          onClose={() => {
            setSelectedResetTenant(null);
            setSelectedResetUser(null);
          }}
          onSuccess={() => {
            setToastMessage("Senha do usuário redefinida com sucesso!");
          }}
        />
      )}

      <EditTenantTokensModal
        tenant={selectedTokenTenant}
        isOpen={!!selectedTokenTenant}
        onClose={() => setSelectedTokenTenant(null)}
        onSuccess={() => {
          setToastMessage("Tokens fiscais atualizados com sucesso!");
          loadTenants();
        }}
      />
    </div>
  );
}
