import archiver from "archiver";
import { Writable } from "stream";
import { prismaAdmin } from "@/lib/prismaAdmin";
import { getFileFromStorage } from "@/lib/storage";
import { StatusNota } from "@prisma/client";

/**
 * Cria um Buffer de arquivo ZIP a partir de uma lista de entradas em memória
 */
export function buildZipBuffer(
  entries: Array<{ name: string; content: Buffer | string }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const bufferStream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    bufferStream.on("finish", () => {
      resolve(Buffer.concat(chunks));
    });

    archive.on("error", (err) => reject(err));
    archive.pipe(bufferStream);

    for (const entry of entries) {
      archive.append(entry.content, { name: entry.name });
    }

    archive.finalize();
  });
}

/**
 * Gera o pacote completo em arquivo .ZIP contendo XMLs, PDFs e Relatório CSV para o contador
 */
export async function generateMonthlyZipBuffer({
  tenantId,
  mes,
  ano,
}: {
  tenantId: string;
  mes: number;
  ano: number;
}) {
  const mesPad = String(mes).padStart(2, "0");
  const mesAnoFile = `${ano}-${mesPad}`;

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Oficina não encontrada.");
  }

  const startDate = new Date(ano, mes - 1, 1, 0, 0, 0);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);

  // Busca notas autorizadas do período
  const invoices = await prismaAdmin.invoice.findMany({
    where: {
      tenantId,
      status: StatusNota.AUTORIZADA,
      dataEmissao: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      partner: {
        select: { razaoSocial: true, cnpj: true },
      },
    },
    orderBy: { numero: "asc" },
  });

  const zipEntries: Array<{ name: string; content: Buffer | string }> = [];

  // Relatório CSV para o contador com segregação de CFOPs e blindagem do Simples Nacional
  let csvReport = "Numero;Serie;Tipo;Modalidade;CFOP_Principal;ChaveAcesso;Parceiro;CNPJ;ValorTotal;BaseCalculoSimples;DataEmissao;Status\n";
  let totalValor = 0;
  let totalTributavelSimples = 0;
  let totalNaoTributavel = 0;

  for (const inv of invoices) {
    const chave = inv.chaveAcesso || `NF_${inv.numero}`;
    const valor = Number(inv.valorTotal) || 0;
    totalValor += valor;

    let modalidade = inv.modalidadeEmissao || (inv.tipo === "ENTRADA" ? "REMESSA_ENTRADA" : "OUTRO");
    let cfopPrincipal = "5902";
    let baseCalculoSimples = 0;

    if (inv.modalidadeEmissao === "COBRANCA_INDUSTRIALIZACAO") {
      cfopPrincipal = "5124";
      baseCalculoSimples = valor;
      totalTributavelSimples += valor;
    } else if (inv.modalidadeEmissao === "RETORNO_MERCADORIA") {
      cfopPrincipal = "5902";
      baseCalculoSimples = 0;
      totalNaoTributavel += valor;
    } else if (inv.modalidadeEmissao === "CONJUNTA") {
      cfopPrincipal = "5902/5124";
      const raw: any = inv.rawJson || {};
      const itens = raw?.payloadEnviado?.itens || raw?.itens || [];
      const itemServico = itens.find((it: any) => it.cfop === "5124");
      const valorServico = itemServico ? Number(itemServico.valor_total || 0) : 0;
      baseCalculoSimples = valorServico;
      totalTributavelSimples += valorServico;
      totalNaoTributavel += (valor - valorServico);
    } else if (inv.tipo === "ENTRADA") {
      cfopPrincipal = "5901";
      baseCalculoSimples = 0;
    } else {
      baseCalculoSimples = 0;
      totalNaoTributavel += valor;
    }

    const valorFmt = valor.toFixed(2).replace(".", ",");
    const baseSimplesFmt = baseCalculoSimples.toFixed(2).replace(".", ",");
    const dataFmt = inv.dataEmissao
      ? new Date(inv.dataEmissao).toLocaleDateString("pt-BR")
      : "";
    const parceiroNome = (inv.partner?.razaoSocial || "N/A").replace(/;/g, " ");
    const parceiroCnpj = inv.partner?.cnpj || "N/A";

    csvReport += `${inv.numero};${inv.serie};${inv.tipo};${modalidade};${cfopPrincipal};${chave};${parceiroNome};${parceiroCnpj};${valorFmt};${baseSimplesFmt};${dataFmt};${inv.status}\n`;

    // XML
    if (inv.xmlUrl) {
      try {
        const xmlBuffer = await getFileFromStorage(inv.xmlUrl);
        if (xmlBuffer) {
          zipEntries.push({
            name: `xml/${chave}.xml`,
            content: xmlBuffer,
          });
        }
      } catch (err) {
        console.warn(`[generateMonthlyZipBuffer] Erro ao obter XML ${chave}:`, err);
      }
    } else if (inv.rawJson) {
      zipEntries.push({
        name: `xml/${chave}_dados.json`,
        content: JSON.stringify(inv.rawJson, null, 2),
      });
    }

    // PDF DANFE
    if (inv.pdfUrl) {
      try {
        const pdfBuffer = await getFileFromStorage(inv.pdfUrl);
        if (pdfBuffer) {
          zipEntries.push({
            name: `pdf/${chave}.pdf`,
            content: pdfBuffer,
          });
        }
      } catch (err) {
        console.warn(`[generateMonthlyZipBuffer] Erro ao obter PDF ${chave}:`, err);
      }
    }
  }

  // Rodapé com Resumo Fiscal para o Contador
  const totalGeralFmt = totalValor.toFixed(2).replace(".", ",");
  const totalTributavelFmt = totalTributavelSimples.toFixed(2).replace(".", ",");
  const totalNaoTributavelFmt = totalNaoTributavel.toFixed(2).replace(".", ",");

  csvReport += `\n`;
  csvReport += `--- RESUMO FISCAL PARA APURACAO DO SIMPLES NACIONAL (LC 123/2006) ---\n`;
  csvReport += `Total Geral Movimentado no Periodo:;R$ ${totalGeralFmt}\n`;
  csvReport += `BASE DE CALCULO TRIBUTAVEL (CFOP 5124 - Anexo II Industria):;R$ ${totalTributavelFmt}\n`;
  csvReport += `TOTAL NAO TRIBUTAVEL (CFOP 5902 - Retorno de Insumos de Terceiros):;R$ ${totalNaoTributavelFmt}\n`;
  csvReport += `AVISO AO CONTADOR:;Apenas o valor indicado na BASE DE CALCULO TRIBUTAVEL (CFOP 5124) deve compor a receita bruta para a guia DAS. Os valores sob CFOP 5902 representam mero retorno de mercadoria de terceiros sem acrescimo patrimonial.\n`;

  // Relatório CSV na raiz do ZIP
  const safeName = (tenant.nomeFantasia || tenant.razaoSocial).replace(/\W+/g, "_");
  const fileName = `Notas_Contador_${safeName}_${mesPad}_${ano}.zip`;

  zipEntries.push({
    name: `Relatorio_Fiscal_${safeName}_${mesAnoFile}.csv`,
    content: "\uFEFF" + csvReport,
  });

  const zipBuffer = await buildZipBuffer(zipEntries);

  return {
    zipBuffer,
    fileName,
    totalNotas: invoices.length,
    totalValor,
    mesPad,
    ano,
    tenant,
  };
}
