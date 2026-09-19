import fs from "fs";
import path from "path";
import { PrismaClient, TipoNota, StatusNota } from "@prisma/client";
import { parseDanfePdf } from "../src/lib/services/danfePdfParser";
import { prepareInvoiceInversion, buildFocusNfePayload } from "../src/lib/services/inversion";

const prisma = new PrismaClient();

async function importDanfeFile(filePath: string, tenantId: string, partnerId: string) {
  const buf = fs.readFileSync(filePath);
  const parsed = await parseDanfePdf(buf);

  console.log(`\n==================================================`);
  console.log(`📄 Importando NF-e Nº ${parsed.numero} (Série ${parsed.serie})`);
  console.log(`Chave SEFAZ: ${parsed.chaveAcesso}`);
  console.log(`Emitente: ${parsed.emitente.razaoSocial} | Valor Total: R$ ${parsed.valorTotal.toFixed(2)}`);
  console.log(`Itens extraídos: ${parsed.itens.length}`);
  console.log(`==================================================`);

  // Upsert da Invoice de entrada
  const invoice = await prisma.invoice.upsert({
    where: { chaveAcesso: parsed.chaveAcesso },
    update: {
      numero: parsed.numero,
      serie: parsed.serie,
      tipo: TipoNota.ENTRADA,
      finalidade: parsed.naturezaOperacao,
      status: StatusNota.AUTORIZADA,
      valorTotal: parsed.valorTotal,
      dataEmissao: parsed.dataEmissao,
      partnerId,
      rawJson: {
        emitente: parsed.emitente,
        destinatario: parsed.destinatario,
        itens: parsed.itens,
      } as any,
    },
    create: {
      tenantId,
      numero: parsed.numero,
      serie: parsed.serie,
      chaveAcesso: parsed.chaveAcesso,
      tipo: TipoNota.ENTRADA,
      finalidade: parsed.naturezaOperacao,
      status: StatusNota.AUTORIZADA,
      valorTotal: parsed.valorTotal,
      dataEmissao: parsed.dataEmissao,
      partnerId,
      idempotencyKey: `import_${tenantId}_${parsed.chaveAcesso}`,
      rawJson: {
        emitente: parsed.emitente,
        destinatario: parsed.destinatario,
        itens: parsed.itens,
      } as any,
    },
  });

  console.log(`[✓] Invoice registrada com sucesso no banco de dados (ID: ${invoice.id})`);

  // Registra no AuditLog
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorType: "ADMIN",
      actorId: "SISTEMA_TESTE",
      acao: "IMPORTACAO_DANFE_PDF",
      entidade: "Invoice",
      entidadeId: invoice.id,
      detalhe: {
        numero: parsed.numero,
        chaveAcesso: parsed.chaveAcesso,
        totalItens: parsed.itens.length,
        valorTotal: parsed.valorTotal,
      },
    },
  });

  // Testa a Inversão em 1 Clique
  console.log(`\n🔄 [Teste de Inversão em 1 Clique]`);
  const inversionResult = await prepareInvoiceInversion(tenantId, invoice.id);

  if (!inversionResult.success || !inversionResult.data) {
    throw new Error(`Falha na inversão da nota ${parsed.numero}: ${inversionResult.error}`);
  }

  const { itensRetorno, totalInsumosRetorno, quantidadeTotalPecas } = inversionResult.data;
  console.log(`[✓] Inversão preparada com sucesso!`);
  console.log(`    - Total de itens convertidos: ${itensRetorno.length}`);
  console.log(`    - Total insumos calculados: R$ ${totalInsumosRetorno.toFixed(2)}`);
  console.log(`    - Quantidade total de peças: ${quantidadeTotalPecas}`);

  // Valida os CFOPs invertidos (5901 -> 5902)
  for (const item of itensRetorno) {
    if (item.cfopSaida !== "5902") {
      throw new Error(`Item #${item.numeroItem} não foi invertido para CFOP 5902! (Atual: ${item.cfopSaida})`);
    }
  }
  console.log(`[✓] 100% dos itens receberam CFOP 5902 (Retorno de Mercadoria Recebida para Industrialização).`);

  // Testa a geração do payload oficial para Focus NFe
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });

  const payload = buildFocusNfePayload({
    tenant,
    partner,
    chaveAcessoEntrada: parsed.chaveAcesso,
    itensRetorno,
    cobrarServico: true,
    valorServicoPorPeca: 15.0, // R$ 15 por peça de mão de obra
    quantidadePecasServico: 30,
    observacoesFiscais: "Retorno referente pedido de corte e costura",
    emitenteInfo: parsed.emitente,
  });

  console.log(`[✓] Payload Focus NFe gerado com sucesso:`);
  console.log(`    - Chave Referenciada: ${payload.notas_referenciadas[0].chave_nfe}`);
  console.log(`    - Destinatário: ${payload.nome_destinatario} (CNPJ: ${payload.cnpj_destinatario})`);
  console.log(`    - IE Destinatário: ${payload.inscricao_estadual_destinatario} (Indicador: ${payload.indicador_inscricao_estadual_destinatario})`);
  console.log(`    - Endereço Destinatário: ${payload.logradouro_destinatario}, ${payload.numero_destinatario} - ${payload.municipio_destinatario}/${payload.uf_destinatario}`);
  console.log(`    - Total de itens fiscais no payload: ${payload.itens.length}`);

  return invoice;
}

async function main() {
  console.log("==================================================");
  console.log("🚀 IMPORTAÇÃO E TESTE DE INVERSÃO DAS 2 NOTAS");
  console.log("==================================================");

  const tenant = await prisma.tenant.findUnique({
    where: { cnpj: "00168223000162" },
  });

  if (!tenant) {
    throw new Error("Tenant da oficina H E LEMOS não encontrado.");
  }

  const partner = await prisma.partner.findFirst({
    where: {
      tenantId: tenant.id,
      cnpj: "72305295000115",
    },
  });

  if (!partner) {
    throw new Error("Fábrica parceira RITMI CONFECÇÕES não encontrada.");
  }

  const f1 = path.join(process.cwd(), "42260972305295000115550010002382931023088624-DANFE.pdf");
  const f2 = path.join(process.cwd(), "42260972305295000115550010002385901023122312-DANFE.pdf");

  await importDanfeFile(f1, tenant.id, partner.id);
  await importDanfeFile(f2, tenant.id, partner.id);

  console.log("\n==================================================");
  console.log("🎉 TODAS AS NOTAS FORAM IMPORTADAS E VALIDADAS!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
