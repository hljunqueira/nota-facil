/**
 * Script de Teste Automatizado do Worker BullMQ de Sincronização MDe
 * Valida a execução de múltiplos ciclos comprovando idempotência estrita e zero duplicidades.
 */

import { processTenantMdeItems } from "../src/workers/syncInvoicesWorker";

async function runWorkerIdempotencyTest() {
  console.log("================================================================");
  console.log("🧪 [TESTE BULLMQ WORKER] Iniciando Teste de Idempotência e Sincronização");
  console.log("================================================================");

  // Banco de dados simulado em memória
  const mockDatabase = {
    invoices: new Map<string, any>(),
    partners: new Map<string, any>(),
    auditLogs: [] as any[],

    invoice: {
      async findFirst({ where }: any) {
        for (const inv of mockDatabase.invoices.values()) {
          if (where?.OR) {
            for (const cond of where.OR) {
              if (cond.chaveAcesso && inv.chaveAcesso === cond.chaveAcesso) return inv;
              if (cond.idempotencyKey && inv.idempotencyKey === cond.idempotencyKey) return inv;
            }
          }
        }
        return null;
      },
      async create({ data }: any) {
        const id = `inv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { id, ...data };
        mockDatabase.invoices.set(id, record);
        return record;
      },
    },

    partner: {
      async findFirst({ where }: any) {
        for (const part of mockDatabase.partners.values()) {
          if (part.tenantId === where?.tenantId && part.cnpj === where?.cnpj) {
            return part;
          }
        }
        return null;
      },
      async create({ data }: any) {
        const id = `part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { id, ...data };
        mockDatabase.partners.set(id, record);
        return record;
      },
    },

    auditLog: {
      async create({ data }: any) {
        mockDatabase.auditLogs.push(data);
        return data;
      },
    },
  };

  const mockTenant = {
    id: "tenant_faccao_01",
    lastMdeVersao: BigInt(100),
    ambiente: "HOMOLOGACAO",
    cnpj: "12.345.678/0001-90",
  };

  const loteNotasMde = [
    {
      chave_nfe: "35260100000000000191550010000000011000000088",
      numero: "5020",
      serie: "1",
      nome_emitente: "Ritme Têxtil e Confecções S.A.",
      cnpj_emitente: "98.765.432/0001-11",
      valor_total: 18450.0,
      data_emissao: "2026-03-01T10:00:00Z",
    },
    {
      chave_nfe: "35260100000000000191550010000000011000000099",
      numero: "5021",
      serie: "1",
      nome_emitente: "Ritme Têxtil e Confecções S.A.",
      cnpj_emitente: "98.765.432/0001-11",
      valor_total: 9200.0,
      data_emissao: "2026-03-01T11:30:00Z",
    },
  ];

  console.log("\n[CICLO 1] Processando primeiro lote com 2 notas de entrada...");
  const cycle1 = await processTenantMdeItems(mockTenant, loteNotasMde, mockDatabase as any, true);
  console.log("Resultado do Ciclo 1:", cycle1);

  if (cycle1.newInvoicesImported !== 2 || cycle1.duplicatesSkipped !== 0) {
    throw new Error(`Falha no Ciclo 1: esperava 2 importadas e 0 duplicadas, obteve ${JSON.stringify(cycle1)}`);
  }
  console.log("✅ Ciclo 1 validado: 2 novas notas importadas, 0 duplicatas.");

  console.log("\n[CICLO 2] Repetindo exatamente o mesmo lote (simulando poll de reexecução)...");
  const cycle2 = await processTenantMdeItems(mockTenant, loteNotasMde, mockDatabase as any, true);
  console.log("Resultado do Ciclo 2:", cycle2);

  if (cycle2.newInvoicesImported !== 0 || cycle2.duplicatesSkipped !== 2) {
    throw new Error(`Falha no Ciclo 2: esperava 0 importadas e 2 duplicadas, obteve ${JSON.stringify(cycle2)}`);
  }
  console.log("✅ Ciclo 2 validado: 0 notas importadas, 2 duplicatas descartadas com sucesso.");

  console.log("\n[CICLO 3] Processando lote misto (1 nota existente + 1 nota nova)...");
  const loteMisto = [
    loteNotasMde[0], // já existente (deve ser pulada)
    {
      chave_nfe: "35260100000000000191550010000000011000000077",
      numero: "5022",
      serie: "1",
      nome_emitente: "Nova Fiação Industrial Ltda",
      cnpj_emitente: "11.222.333/0001-44",
      valor_total: 5600.0,
      data_emissao: "2026-03-02T08:00:00Z",
    },
  ];

  const cycle3 = await processTenantMdeItems(mockTenant, loteMisto, mockDatabase as any, true);
  console.log("Resultado do Ciclo 3:", cycle3);

  if (cycle3.newInvoicesImported !== 1 || cycle3.duplicatesSkipped !== 1) {
    throw new Error(`Falha no Ciclo 3: esperava 1 importada e 1 duplicada, obteve ${JSON.stringify(cycle3)}`);
  }
  console.log("✅ Ciclo 3 validado: 1 nova importada, 1 duplicata descartada.");

  // Validação final de integridade do banco de dados
  const totalNotasBanco = mockDatabase.invoices.size;
  console.log(`\nTotal de notas persistidas no banco simulado: ${totalNotasBanco} (Esperado: 3)`);
  if (totalNotasBanco !== 3) {
    throw new Error(`Inconsistência no banco: esperado 3 notas, total atual: ${totalNotasBanco}`);
  }

  // Validação de parceiros únicos cadastrados
  const totalParceiros = mockDatabase.partners.size;
  console.log(`Total de parceiros cadastrados: ${totalParceiros} (Esperado: 2 - Ritme e Nova Fiação)`);
  if (totalParceiros !== 2) {
    throw new Error(`Inconsistência de parceiros: esperado 2 parceiros, total atual: ${totalParceiros}`);
  }

  console.log("\n================================================================");
  console.log("🎉 [SUCESSO TOTAL] Idempotência do Worker BullMQ 100% comprovada!");
  console.log("================================================================");
  process.exit(0);
}

runWorkerIdempotencyTest().catch((err) => {
  console.error("❌ ERRO NO TESTE:", err);
  process.exit(1);
});
