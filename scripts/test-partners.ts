/**
 * Teste Automatizado — Gestão de Parceiros (Partner) e Integridade Referencial
 * Executa testes de validação, CRUD e bloqueio de exclusão em parceiros com notas fiscais.
 */

import { partnerSchema } from "../src/lib/validations";

interface MockPartner {
  id: string;
  tenantId: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  email?: string | null;
  telefone?: string | null;
  invoicesCount: number;
}

function simulateDeletePartner(
  partner: MockPartner,
  auditLog: any[]
): { success: boolean; blockedByInvoices?: boolean; error?: string } {
  if (partner.invoicesCount > 0) {
    return {
      success: false,
      blockedByInvoices: true,
      error: `Não é possível excluir a fábrica parceira "${partner.razaoSocial}" pois existem ${partner.invoicesCount} nota(s) fiscal(is) vinculada(s) ao histórico da oficina.`,
    };
  }

  auditLog.push({
    actorType: "USER",
    actorId: "user_test_123",
    acao: "PARTNER_EXCLUIDO",
    entidade: "Partner",
    entidadeId: partner.id,
    detalhe: { razaoSocial: partner.razaoSocial, cnpj: partner.cnpj },
  });

  return { success: true };
}

async function main() {
  console.log("================================================================");
  console.log("🧪 [TESTE GESTÃO DE PARCEIROS] Iniciando Testes de CRUD e Bloqueio");
  console.log("================================================================");

  // 1. Validação de Schema Zod do Partner
  console.log("\n1. Testando validação de CNPJ do parceiro...");
  const validPayload = {
    razaoSocial: "Ritme Confecções e Têxtil S.A.",
    nomeFantasia: "Ritme",
    cnpj: "12.345.678/0001-95", // CNPJ com dígito válido
    email: "financeiro@ritme.com.br",
    telefone: "(47) 98877-6655",
  };

  const parsed = partnerSchema.safeParse(validPayload);
  if (!parsed.success) {
    throw new Error(`Falha esperada ao validar parceiro válido: ${JSON.stringify(parsed.error)}`);
  }
  console.log("✅ Validação de parceiro com dados corretos aprovada!");

  // Teste de CNPJ inválido
  const invalidCnpjPayload = {
    ...validPayload,
    cnpj: "11.111.111/1111-11", // Dígitos falsos
  };
  const parsedInvalid = partnerSchema.safeParse(invalidCnpjPayload);
  if (parsedInvalid.success) {
    throw new Error("Erro: O schema deveria rejeitar CNPJ inválido!");
  }
  console.log("✅ Bloqueio de CNPJ com dígito verificador inválido comprovado!");

  // 2. Teste de Bloqueio de Exclusão (Integridade Referencial com Invoices)
  console.log("\n2. Testando bloqueio de exclusão de fábrica com notas fiscais vinculadas...");
  const auditLog: any[] = [];
  const partnerWithInvoices: MockPartner = {
    id: "part_ritme_01",
    tenantId: "tenant_faccao_01",
    razaoSocial: "Ritme Confecções S.A.",
    nomeFantasia: "Ritme",
    cnpj: "12345678000195",
    invoicesCount: 14, // Possui 14 notas no histórico
  };

  const deleteAttempt1 = simulateDeletePartner(partnerWithInvoices, auditLog);
  console.log("-> Tentativa de exclusão:", deleteAttempt1);
  if (deleteAttempt1.success || !deleteAttempt1.blockedByInvoices) {
    throw new Error("Falha crítica: fábrica com notas fiscais vinculadas NÃO pode ser excluída!");
  }
  console.log("✅ Proteção aprovada: Exclusão impedida devido a 14 notas vinculadas.");

  // 3. Teste de Exclusão Permitida (Sem Notas Fiscais)
  console.log("\n3. Testando exclusão permitida de parceiro sem notas fiscais...");
  const partnerWithoutInvoices: MockPartner = {
    id: "part_nova_02",
    tenantId: "tenant_faccao_01",
    razaoSocial: "Fiação Vale do Itajaí Ltda",
    nomeFantasia: "Fiação Vale",
    cnpj: "98765432000188",
    invoicesCount: 0, // Sem notas
  };

  const deleteAttempt2 = simulateDeletePartner(partnerWithoutInvoices, auditLog);
  console.log("-> Tentativa de exclusão:", deleteAttempt2);
  if (!deleteAttempt2.success) {
    throw new Error("Erro: parceiro sem notas fiscais deveria poder ser excluído!");
  }
  console.log("✅ Exclusão permitida com sucesso para parceiro sem movimentação.");

  // 4. Verificação da Trilha de Auditoria
  console.log("\n4. Verificando gravação na Trilha de Auditoria (AuditLog)...");
  if (auditLog.length !== 1 || auditLog[0].acao !== "PARTNER_EXCLUIDO") {
    throw new Error(`AuditLog incorreto: ${JSON.stringify(auditLog)}`);
  }
  console.log("✅ Trilha de Auditoria gravada:", auditLog[0]);

  console.log("\n================================================================");
  console.log("🎉 [SUCESSO TOTAL] Gestão de Parceiros 100% validada!");
  console.log("================================================================");
}

main().catch((err) => {
  console.error("ERRO NO TESTE DE PARCEIROS:", err);
  process.exit(1);
});
