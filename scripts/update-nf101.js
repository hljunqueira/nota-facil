const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.invoice.updateMany({
    where: {
      numero: 101,
      tipo: 'SAIDA',
    },
    data: {
      modalidadeEmissao: 'RETORNO_MERCADORIA',
    },
  });
  console.log('UPDATE RESULT:', res);

  const check = await prisma.invoice.findMany({
    where: { numero: 101 },
    select: { id: true, numero: true, modalidadeEmissao: true, valorTotal: true, finalidade: true },
  });
  console.log('CHECK:', check);
}

main().catch(console.error).finally(() => prisma.$disconnect());
