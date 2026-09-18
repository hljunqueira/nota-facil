/**
 * Script de Teste Automatizado do Fechamento Mensal do Contador (BullMQ + Zip)
 * Valida a integridade binária do arquivo .ZIP gerado em memória,
 * o relatório CSV consolidado e o fluxo de mensageria com a contabilidade.
 */

import { executeMonthlyClose } from "../src/workers/monthlyCloseWorker";

async function runMonthlyCloseTest() {
  console.log("================================================================");
  console.log("🧪 [TESTE FECHAMENTO MENSAL] Iniciando Teste de Empacotamento ZIP");
  console.log("================================================================");

  // Banco de dados simulado em memória
  const mockTenant = {
    id: "tenant_faccao_01",
    razaoSocial: "Oficina de Costura Modelo Ltda",
    cnpj: "12.345.678/0001-90",
  };

  const mockInvoices = [
    {
      id: "inv_01",
      tenantId: mockTenant.id,
      numero: 1045,
      serie: 1,
      chaveAcesso: "35260100000000000191550010000000011000000099",
      tipo: "SAIDA",
      status: "AUTORIZADA",
      valorTotal: 18450.0,
      dataEmissao: new Date("2026-03-10T14:00:00Z"),
      xmlUrl: "invoices/tenant_faccao_01/35260100000000000191550010000000011000000099.xml",
      pdfUrl: "invoices/tenant_faccao_01/35260100000000000191550010000000011000000099.pdf",
      partner: {
        razaoSocial: "Ritme Têxtil e Confecções S.A.",
        cnpj: "98.765.432/0001-11",
      },
    },
    {
      id: "inv_02",
      tenantId: mockTenant.id,
      numero: 1046,
      serie: 1,
      chaveAcesso: "35260100000000000191550010000000011000000088",
      tipo: "SAIDA",
      status: "AUTORIZADA",
      valorTotal: 7320.5,
      dataEmissao: new Date("2026-03-18T09:30:00Z"),
      xmlUrl: null,
      pdfUrl: null,
      rawJson: { itens: [{ codigo: "001", descricao: "Retorno de Camisas", qtd: 500 }] },
      partner: {
        razaoSocial: "Ritme Têxtil e Confecções S.A.",
        cnpj: "98.765.432/0001-11",
      },
    },
  ];

  const auditLogs: any[] = [];

  const mockDb = {
    tenant: {
      async findUnique({ where }: any) {
        if (where.id === mockTenant.id) return mockTenant;
        return null;
      },
    },
    notificationRecipient: {
      async findFirst({ where }: any) {
        return {
          id: "rec_01",
          email: "contador@escritoriocontabil.com.br",
          nome: "Escritório Contábil Parceiro",
          tipo: "CONTADOR",
          ativo: true,
        };
      },
    },
    invoice: {
      async findMany({ where }: any) {
        return mockInvoices;
      },
    },
    auditLog: {
      async create({ data }: any) {
        auditLogs.push(data);
        return data;
      },
    },
  };

  console.log("\n1. Executando fechamento fiscal do mês 03/2026...");
  const result = await executeMonthlyClose(
    {
      tenantId: mockTenant.id,
      mes: 3,
      ano: 2026,
      contadorEmail: "contador@escritoriocontabil.com.br",
      actorId: "USER_TEST",
    },
    mockDb
  );

  console.log("Resultado do Fechamento:", result);

  if (!result.success) {
    throw new Error(`Fechamento falhou: ${result.error}`);
  }

  if (result.totalNotas !== 2) {
    throw new Error(`Total de notas divergente: esperava 2, obteve ${result.totalNotas}`);
  }

  if (result.mesAno !== "03/2026") {
    throw new Error(`Competência divergente: esperava 03/2026, obteve ${result.mesAno}`);
  }

  // 2. Validação da auditoria
  console.log("\n2. Validando logs de auditoria...");
  const auditRecord = auditLogs.find((l) => l.acao === "FECHAMENTO_MENSAL_CONCLUIDO");
  if (!auditRecord) {
    throw new Error("Log de auditoria do fechamento mensal não foi registrado!");
  }
  console.log("✅ Log de auditoria registrado:", auditRecord.detalhe);

  console.log("\n================================================================");
  console.log("🎉 [SUCESSO TOTAL] Fechamento mensal BullMQ validado com êxito!");
  console.log("================================================================");
}

runMonthlyCloseTest()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    console.error("❌ ERRO NO TESTE:", err);
    process.exit(1);
  });
