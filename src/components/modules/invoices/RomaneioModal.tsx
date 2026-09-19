"use client";

import React, { useState } from "react";
import {
  Printer,
  X,
  Truck,
  Package,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  Clock,
} from "lucide-react";

interface RomaneioModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
  tenantInfo?: {
    razaoSocial?: string;
    nomeFantasia?: string | null;
    tenantName?: string | null;
    cnpj?: string;
    inscricaoEstadual?: string;
    telefoneContato?: string;
    [key: string]: any;
  } | null;
}

export function RomaneioModal({
  isOpen,
  onClose,
  invoice,
  tenantInfo,
}: RomaneioModalProps) {
  const [motorista, setMotorista] = useState("");
  const [placa, setPlaca] = useState("");
  const [quantidadeVolumes, setQuantidadeVolumes] = useState(1);
  const [tipoVolume, setTipoVolume] = useState("Caixas");
  const [observacoesEntrega, setObservacoesEntrega] = useState("");

  if (!isOpen || !invoice) return null;

  // Extrai itens da nota
  const raw = (invoice.rawJson as any) || {};
  const itens =
    raw.itens ||
    raw.payloadEnviado?.itens ||
    raw.focusPayload?.itens ||
    [];

  const totalPecas = itens.reduce((acc: number, it: any) => {
    return acc + Number(it.quantidade || it.quantidade_comercial || 1);
  }, 0);

  const emitenteNome =
    tenantInfo?.nomeFantasia ||
    tenantInfo?.razaoSocial ||
    tenantInfo?.tenantName ||
    "Oficina de Costura";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Container não-imprimível na tela, mas impresso no print */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Header - Oculto na Impressão */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Romaneio de Entrega Física — NF-e Nº {invoice.numero}
              </h2>
              <p className="text-xs text-slate-500">
                Folha de conferência de carga e canhoto para assinatura no recebimento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Romaneio</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Painel de Configuração Rápida - Oculto na Impressão */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs print:hidden">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Motorista / Entregador
            </label>
            <input
              type="text"
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              placeholder="Nome de quem levará"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Placa do Veículo
            </label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              placeholder="Ex: BRA2E19"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Quantidade de Volumes
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                value={quantidadeVolumes}
                onChange={(e) => setQuantidadeVolumes(Number(e.target.value))}
                className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
              />
              <select
                value={tipoVolume}
                onChange={(e) => setTipoVolume(e.target.value)}
                className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="Caixas">Caixas</option>
                <option value="Fardos">Fardos</option>
                <option value="Pacotes">Pacotes</option>
                <option value="Cabides">Cabides</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Observação de Despacho
            </label>
            <input
              type="text"
              value={observacoesEntrega}
              onChange={(e) => setObservacoesEntrega(e.target.value)}
              placeholder="Ex: Carga frágil / Conferir peças"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* DOCUMENTO OFICIAL FORMATADO (Visível na Tela e Pronto para Print A4) */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 font-sans text-slate-900 print:p-0 print:overflow-visible">
          {/* Cabeçalho do Romaneio */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                Comprovante de Despacho e Carga
              </span>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Romaneio de Entrega Física da Costura
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Vinculado à <strong>NF-e Nº {invoice.numero}</strong> (Série {invoice.serie}) • Emissão:{" "}
                {new Date(invoice.dataEmissao).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono font-bold text-xs">
                {quantidadeVolumes} {tipoVolume.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Dados das Empresas */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Oficina de Costura (Remetente)
              </span>
              <p className="font-bold text-slate-900 text-sm">{emitenteNome}</p>
              <p className="text-slate-600">CNPJ: {tenantInfo?.cnpj || "-"}</p>
              <p className="text-slate-600">
                IE: {tenantInfo?.inscricaoEstadual || "ISENTO"} • Tel:{" "}
                {tenantInfo?.telefoneContato || "-"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Fábrica Encomendante (Destinatário)
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {invoice.partner?.razaoSocial || "Fábrica Parceira"}
              </p>
              <p className="text-slate-600">CNPJ: {invoice.partner?.cnpj || "-"}</p>
              <p className="text-slate-600">
                IE: {invoice.partner?.inscricaoEstadual || "ISENTO"}
              </p>
            </div>
          </div>

          {/* Dados do Transporte / Veículo */}
          <div className="grid grid-cols-3 gap-3 text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/30">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Motorista:</span>
              <strong className="text-slate-900">{motorista || "Próprio / Da Oficina"}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Veículo / Placa:</span>
              <strong className="text-slate-900 font-mono">{placa || "NÃO INFORMADA"}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block">Data do Despacho:</span>
              <strong className="text-slate-900">
                {new Date().toLocaleDateString("pt-BR")} às{" "}
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </strong>
            </div>
          </div>

          {/* Tabela de OPs / Itens da Carga */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Relação de Peças e OPs para Conferência
              </h3>
              <span className="text-xs font-semibold text-slate-600">
                Total de Peças: <strong>{totalPecas}</strong>
              </span>
            </div>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Item / OP</th>
                  <th className="py-2 px-3">Descrição do Modelo / Peça</th>
                  <th className="py-2 px-3 text-center">Unidade</th>
                  <th className="py-2 px-3 text-right">Qtd. Enviada</th>
                  <th className="py-2 px-3 text-center w-24">Conferido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itens.length > 0 ? (
                  itens.map((it: any, idx: number) => {
                    const opOrRef = it.codigo || it.referencia || `OP #${idx + 1}`;
                    const desc = it.descricao || "Serviço de Costura / Industrialização";
                    const qtd = Number(it.quantidade || it.quantidade_comercial || 1);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {opOrRef}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{desc}</td>
                        <td className="py-2 px-3 text-center font-mono">
                          {it.unidade_comercial || it.unidade || "UN"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                          {qtd}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block w-4 h-4 border border-slate-400 rounded-xs"></span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-2 px-3 font-mono font-bold">1</td>
                    <td className="py-2 px-3">Lote de Peças Confeccionadas conforme NF-e</td>
                    <td className="py-2 px-3 text-center font-mono">PC</td>
                    <td className="py-2 px-3 text-right font-bold font-mono">1</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block w-4 h-4 border border-slate-400 rounded-xs"></span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {observacoesEntrega && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <strong>Observações:</strong> {observacoesEntrega}
            </div>
          )}

          {/* Chave da NF-e */}
          {invoice.chaveAcesso && (
            <div className="text-[10px] text-slate-500 font-mono">
              Chave de Acesso NF-e SEFAZ: {invoice.chaveAcesso}
            </div>
          )}

          {/* Termo e Canhoto de Recebimento */}
          <div className="pt-4 border-t-2 border-dashed border-slate-300 space-y-8">
            <p className="text-[11px] text-slate-600 leading-relaxed text-center">
              Declaramos para os devidos fins ter recebido em perfeita ordem física e quantidade as mercadorias/peças descritas neste romaneio e na respectiva Nota Fiscal Eletrônica.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center space-y-1">
                <div className="border-b border-slate-900 w-full mb-1"></div>
                <p className="text-xs font-bold text-slate-900">
                  {emitenteNome}
                </p>
                <p className="text-[10px] text-slate-500">Assinatura do Expedidor / Oficina</p>
              </div>

              <div className="text-center space-y-1">
                <div className="border-b border-slate-900 w-full mb-1"></div>
                <p className="text-xs font-bold text-slate-900">
                  Recebido por: ____________________________________
                </p>
                <p className="text-[10px] text-slate-500">
                  Data: ____/____/2026 • Assinatura e Carimbo do Conferente
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
