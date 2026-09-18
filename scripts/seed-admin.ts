import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("🌱 [Seed] Criando Administrador Master: Henrique");
  console.log("==================================================");

  const senhaMaster = "183834@Hlj";
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(senhaMaster, salt);

  // Criamos o admin com os logins/aliases possíveis para máxima comodidade
  const adminLogins = [
    { email: "henrique", nome: "Henrique" },
    { email: "admin", nome: "Henrique" },
    { email: "admin@appnotafacil.online", nome: "Henrique" },
    { email: "henrique@appnotafacil.online", nome: "Henrique" },
  ];

  for (const item of adminLogins) {
    const admin = await prisma.platformAdmin.upsert({
      where: { email: item.email },
      update: {
        nome: item.nome,
        senhaHash,
      },
      create: {
        email: item.email,
        nome: item.nome,
        senhaHash,
      },
    });
    console.log(`[✓] PlatformAdmin configurado: ${admin.nome} (${admin.email})`);
  }

  console.log("==================================================");
  console.log("🎉 ADMIN CRIADO COM SUCESSO!");
  console.log("Você pode logar digitando:");
  console.log("- Usuário: henrique  (ou admin@appnotafacil.online)");
  console.log(`- Senha:   ${senhaMaster}`);
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Erro ao criar admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
