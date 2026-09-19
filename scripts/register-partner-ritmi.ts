import { PrismaClient, TipoDestinatario, CanalNotificacao } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("🏢 [Cadastro de Parceiro] Vinculando RITMI CONFECÇÕES");
  console.log("==================================================");

  const tenantCnpj = "00168223000162"; // H E LEMOS CONFECCAO
  const partnerCnpj = "72305295000115"; // RITMI CONFECCOES LTDA

  // 1. Busca o Tenant da cliente
  const tenant = await prisma.tenant.findUnique({
    where: { cnpj: tenantCnpj },
  });

  if (!tenant) {
    throw new Error(`Tenant com CNPJ ${tenantCnpj} não encontrado no banco de dados.`);
  }

  console.log(`[✓] Tenant localizado: ${tenant.razaoSocial} (ID: ${tenant.id})`);

  // 1.1 Atualiza a Inscrição Estadual e Telefone do Tenant com base no DANFE oficial SEFAZ
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      inscricaoEstadual: "255076851",
      telefoneContato: "(48) 9185-2757",
    },
  });
  console.log(`[✓] Dados do Tenant atualizados com IE oficial SEFAZ: 255076851 e Tel: (48) 9185-2757`);

  // 2. Cadastra ou atualiza a Fábrica Parceira RITMI CONFECCOES
  const partner = await prisma.partner.upsert({
    where: {
      tenantId_cnpj: {
        tenantId: tenant.id,
        cnpj: partnerCnpj,
      },
    },
    update: {
      razaoSocial: "RITMI CONFECCOES LTDA",
      nomeFantasia: "RITMI",
      email: "fiscal@ritmi.com.br",
      telefone: "4835336300",
    },
    create: {
      tenantId: tenant.id,
      cnpj: partnerCnpj,
      razaoSocial: "RITMI CONFECCOES LTDA",
      nomeFantasia: "RITMI",
      email: "fiscal@ritmi.com.br",
      telefone: "4835336300",
    },
  });

  console.log(`[✓] Parceiro cadastrado/atualizado: ${partner.razaoSocial} (ID: ${partner.id}, CNPJ: ${partner.cnpj})`);

  // 3. Cadastra ou atualiza o Destinatário de Notificação para a Fábrica Parceira
  const existingRecipient = await prisma.notificationRecipient.findFirst({
    where: {
      tenantId: tenant.id,
      partnerId: partner.id,
    },
  });

  if (existingRecipient) {
    await prisma.notificationRecipient.update({
      where: { id: existingRecipient.id },
      data: {
        nome: "RITMI CONFECÇÕES (Fiscal)",
        tipo: TipoDestinatario.PARCEIRO,
        canal: CanalNotificacao.WHATSAPP,
        telefone: "4835336300",
        email: "fiscal@ritmi.com.br",
        ativo: true,
      },
    });
    console.log(`[✓] Destinatário de notificação atualizado para a fábrica.`);
  } else {
    await prisma.notificationRecipient.create({
      data: {
        tenantId: tenant.id,
        partnerId: partner.id,
        nome: "RITMI CONFECÇÕES (Fiscal)",
        tipo: TipoDestinatario.PARCEIRO,
        canal: CanalNotificacao.WHATSAPP,
        telefone: "4835336300",
        email: "fiscal@ritmi.com.br",
        ativo: true,
      },
    });
    console.log(`[✓] Novo destinatário de notificação criado para a fábrica.`);
  }

  // 4. Grava na Trilha de Auditoria
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "ADMIN",
      actorId: "SISTEMA",
      acao: "PARTNER_CADASTRADO_VIA_SCRIPT",
      entidade: "Partner",
      entidadeId: partner.id,
      detalhe: {
        razaoSocial: partner.razaoSocial,
        cnpj: partner.cnpj,
        tenantCnpj: tenant.cnpj,
        telefone: partner.telefone,
        email: partner.email,
      },
    },
  });

  console.log("[✓] Trilha de Auditoria (AuditLog) registrada com sucesso.");
  console.log("==================================================");
  console.log("🎉 CADASTRO DO PARCEIRO FINALIZADO COM SUCESSO!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao cadastrar parceiro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
