import { PrismaClient, StatusCadastro, StatusConta, AmbienteFiscal, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("🌱 [Seed] Inserindo primeira cliente: H E LEMOS CONFECCAO");
  console.log("==================================================");

  const cnpjClean = "00168223000162";
  const emailCliente = "pancho.fofo10@gmail.com";
  const senhaTemporaria = "Hilda@2026";

  // Criptografa a senha temporária
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(senhaTemporaria, salt);

  // Validade do Certificado Digital A1 conforme Termo de Titularidade (21/07/2026 + 12 meses)
  const certificadoValidoAte = new Date("2027-07-21T13:46:49.000Z");

  // 1. Cria ou Atualiza o Tenant
  const tenant = await prisma.tenant.upsert({
    where: { cnpj: cnpjClean },
    update: {
      razaoSocial: "H E LEMOS CONFECCAO",
      nomeFantasia: "BASISCO",
      inscricaoEstadual: "ISENTO",
      emailPrincipal: emailCliente,
      telefoneContato: "(48) 3251-5300",
      statusCadastro: StatusCadastro.APROVADO,
      statusConta: StatusConta.ATIVO,
      ambiente: AmbienteFiscal.HOMOLOGACAO,
      focusNfeTokenHomologacao: "z0YGKmkRLmkZLQtGC7YVw1k0TL8ZKaWi",
      focusNfeTokenProducao: "HokM4RIK8PqGFyzkgiyShkgiT8gKxQze",
      certificadoValidoAte,
      serieNfe: 1,
      proximoNumero: 1,
    },
    create: {
      razaoSocial: "H E LEMOS CONFECCAO",
      nomeFantasia: "BASISCO",
      cnpj: cnpjClean,
      inscricaoEstadual: "ISENTO",
      emailPrincipal: emailCliente,
      telefoneContato: "(48) 3251-5300",
      statusCadastro: StatusCadastro.APROVADO,
      statusConta: StatusConta.ATIVO,
      ambiente: AmbienteFiscal.HOMOLOGACAO,
      focusNfeTokenHomologacao: "z0YGKmkRLmkZLQtGC7YVw1k0TL8ZKaWi",
      focusNfeTokenProducao: "HokM4RIK8PqGFyzkgiyShkgiT8gKxQze",
      certificadoValidoAte,
      serieNfe: 1,
      proximoNumero: 1,
    },
  });

  console.log(`[✓] Tenant configurado com sucesso: ${tenant.razaoSocial} (ID: ${tenant.id})`);

  // 2. Cria ou Atualiza o Usuário da Titular (Hilda Elvira Lemos)
  const user = await prisma.user.upsert({
    where: { email: emailCliente },
    update: {
      nome: "HILDA ELVIRA LEMOS",
      senhaHash,
      tenantId: tenant.id,
      role: UserRole.TENANT,
    },
    create: {
      nome: "HILDA ELVIRA LEMOS",
      email: emailCliente,
      senhaHash,
      tenantId: tenant.id,
      role: UserRole.TENANT,
    },
  });

  console.log(`[✓] Usuário vinculado: ${user.nome} (${user.email}) com senha temporária: ${senhaTemporaria}`);

  // 3. Cria as Regras Fiscais Padrão de CFOP (5901 -> 5902 / 6901 -> 6902)
  await prisma.cfopRule.upsert({
    where: {
      tenantId_cfopEntrada: {
        tenantId: tenant.id,
        cfopEntrada: "5901",
      },
    },
    update: {
      cfopSaidaCorrespondente: "5902",
      finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
      ativo: true,
    },
    create: {
      tenantId: tenant.id,
      cfopEntrada: "5901",
      cfopSaidaCorrespondente: "5902",
      finalidadeGerada: "Retorno de mercadoria recebida para industrialização",
      ativo: true,
    },
  });

  await prisma.cfopRule.upsert({
    where: {
      tenantId_cfopEntrada: {
        tenantId: tenant.id,
        cfopEntrada: "6901",
      },
    },
    update: {
      cfopSaidaCorrespondente: "6902",
      finalidadeGerada: "Retorno de mercadoria recebida para industrialização (Interestadual)",
      ativo: true,
    },
    create: {
      tenantId: tenant.id,
      cfopEntrada: "6901",
      cfopSaidaCorrespondente: "6902",
      finalidadeGerada: "Retorno de mercadoria recebida para industrialização (Interestadual)",
      ativo: true,
    },
  });

  console.log("[✓] Regras fiscais padrão de CFOP (5.901 ➔ 5.902 e 6.901 ➔ 6.902) ativadas.");

  // 4. Registra no AuditLog
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorType: "ADMIN",
      actorId: "SISTEMA_SEED",
      acao: "SEED_PRIMEIRA_CLIENTE",
      entidade: "Tenant",
      entidadeId: tenant.id,
      detalhe: {
        razaoSocial: tenant.razaoSocial,
        cnpj: tenant.cnpj,
        focusHomologacao: tenant.focusNfeTokenHomologacao,
        focusProducao: tenant.focusNfeTokenProducao,
        certificadoValidoAte: certificadoValidoAte.toISOString(),
      },
    },
  });

  console.log("[✓] AuditLog gerado.");
  console.log("==================================================");
  console.log("🎉 SEED CONCLUÍDO COM SUCESSO!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
