import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("==================================================================");
  console.log("🚀 [EMISSÃO NF-E #106 EM PRODUÇÃO - FOCUS NFE / SEFAZ SC]");
  console.log("==================================================================");

  // 1. Busca Tenant H E LEMOS
  const tenant = await prisma.tenant.findUnique({
    where: { cnpj: "00168223000162" },
  });

  if (!tenant) {
    throw new Error("Tenant H E LEMOS CONFECCAO não encontrado.");
  }

  console.log(`Oficina: ${tenant.razaoSocial} | CNPJ: ${tenant.cnpj}`);
  console.log(`Ambiente Configurado: ${tenant.ambiente}`);

  if (tenant.ambiente !== "PRODUCAO") {
    throw new Error("O ambiente fiscal do tenant não está configurado como PRODUCAO!");
  }

  const tokenProducao = tenant.focusNfeTokenProducao;
  if (!tokenProducao) {
    throw new Error("Token de produção da Focus NFe não configurado!");
  }

  // 2. Busca nota de entrada correspondente (Ritmi 238590)
  const notaEntrada = await prisma.invoice.findFirst({
    where: {
      tenantId: tenant.id,
      numero: 238590,
      tipo: "ENTRADA",
    },
    include: { partner: true },
  });

  if (!notaEntrada) {
    throw new Error("Nota de entrada Remessa 238590 da Ritmi não encontrada no banco.");
  }

  const partnerId = notaEntrada.partnerId;
  const chaveRemessa = notaEntrada.chaveAcesso || "42260972305295000115550010002385901023122312";

  console.log(`Remessa de Origem: NF-e #${notaEntrada.numero} · Fábrica: ${notaEntrada.partner?.razaoSocial}`);
  console.log(`Chave Referenciada: ${chaveRemessa}`);

  // 3. Monta o Payload Oficial da NF 106 com os 16 itens confirmados
  const ref = `nf_${tenant.id}_ret_106_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const payload: any = {
    natureza_operacao: "Remessa para industrializacao por conta e ordem",
    tipo_documento: 1,
    finalidade_emissao: 1,
    numero: 106,
    serie: "1",
    cnpj_emitente: "00168223000162",
    data_emissao: nowIso,
    nome_destinatario: "RITMI CONFECCOES LTDA",
    cnpj_destinatario: "72305295000115",
    inscricao_estadual_destinatario: "252740106",
    indicador_inscricao_estadual_destinatario: 1,
    logradouro_destinatario: "RODOVIA SO 350 - ANTONIO LIVINO F",
    numero_destinatario: "200",
    bairro_destinatario: "NOVA GUARITA",
    municipio_destinatario: "SOMBRIO",
    uf_destinatario: "SC",
    cep_destinatario: "88960000",
    telefone_destinatario: "4835336300",
    notas_referenciadas: [
      { chave_nfe: chaveRemessa }
    ],
    modalidade_frete: "4",
    nome_transportador: "RITMI CONFECCOES LTDA 0 - EMITENTE",
    cnpj_transportador: "72305295000115",
    inscricao_estadual_transportador: "252740106",
    municipio_transportador: "SOMBRIO",
    uf_transportador: "SC",
    itens: [
      {
        numero_item: 1,
        codigo_produto: "INVISIVEL",
        descricao: "Retorno de ZIPER NYLON - COR: 13-1006 - CRME BRLEE TC, TAM: UN 20017 55 COR: 13-1006 - CRME BRLEE TC",
        codigo_ncm: "96071900",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 2,
        valor_unitario_comercial: 1.49,
        valor_bruto: 2.98,
        unidade_tributavel: "UN",
        quantidade_tributavel: 2,
        valor_unitario_tributavel: 1.49,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 2,
        codigo_produto: "INVISIVEL",
        descricao: "Retorno de ZIPER NYLON - COR: 13-1006 - CRME BRLEE TC, TAM: UN 20017 60 COR: 13-1006 - CRME BRLEE TC",
        codigo_ncm: "96071900",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 2,
        valor_unitario_comercial: 1.39,
        valor_bruto: 2.78,
        unidade_tributavel: "UN",
        quantidade_tributavel: 2,
        valor_unitario_tributavel: 1.39,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 3,
        codigo_produto: "INVISIVEL",
        descricao: "Retorno de ZIPER NYLON - COR: 18-0517 - TEA LEAF, TAM: 55 UN 20017 COR: 18-0517 - TEA LEAF",
        codigo_ncm: "96071900",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 12,
        valor_unitario_comercial: 0.85,
        valor_bruto: 10.2,
        unidade_tributavel: "UN",
        quantidade_tributavel: 12,
        valor_unitario_tributavel: 0.85,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 4,
        codigo_produto: "INVISIVEL",
        descricao: "Retorno de ZIPER NYLON - COR: 18-0517 - TEA LEAF, TAM: 60 UN 20017 COR: 18-0517 - TEA LEAF",
        codigo_ncm: "96071900",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 36,
        valor_unitario_comercial: 0.85,
        valor_bruto: 30.6,
        unidade_tributavel: "UN",
        quantidade_tributavel: 36,
        valor_unitario_tributavel: 0.85,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 5,
        codigo_produto: "INVISIVEL",
        descricao: "Retorno de ZIPER NYLON - COR: 18-3918 - CHINA BLUE TC, TAM: UN 20017 55 COR: 18-3918 - CHINA BLUE TC",
        codigo_ncm: "96071900",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 4,
        valor_unitario_comercial: 0.85,
        valor_bruto: 3.4,
        unidade_tributavel: "UN",
        quantidade_tributavel: 4,
        valor_unitario_tributavel: 0.85,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 6,
        codigo_produto: "SANDSHELL",
        descricao: "Retorno de LINHA 120 SANCRIS - COR: 13-0907 - TC, TAM: 2000 20023 JDS COR: 13-0907 - SANDSHELL TC CN",
        codigo_ncm: "55081000",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 1,
        valor_unitario_comercial: 4.55,
        valor_bruto: 4.55,
        unidade_tributavel: "CN",
        quantidade_tributavel: 1,
        valor_unitario_tributavel: 4.55,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 7,
        codigo_produto: "PARTRIDGE",
        descricao: "Retorno de JDS LINHA TRICHE - COR: 18-1124 - TC, TAM: 2000 JDS 22697 COR: 18-1124 - PARTRIDGE TC CN",
        codigo_ncm: "55081000",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 5,
        valor_unitario_comercial: 4.5,
        valor_bruto: 22.5,
        unidade_tributavel: "CN",
        quantidade_tributavel: 5,
        valor_unitario_tributavel: 4.5,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 8,
        codigo_produto: "22697",
        descricao: "Retorno de JDS LINHA TRICHE - COR: 18-3918 - CHINA BLUE TC, TAM: 2000 JDS COR: 18-3918 - CHINA BLUE TC CN",
        codigo_ncm: "55081000",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 5,
        valor_unitario_comercial: 4.5,
        valor_bruto: 22.5,
        unidade_tributavel: "CN",
        quantidade_tributavel: 5,
        valor_unitario_tributavel: 4.5,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 9,
        codigo_produto: "KALAMATA",
        descricao: "Retorno de JDS LINHA TRICHE - COR: 19-0510 - , TAM: 2000 JDS 22697 COR: 19-0510 - KALAMATA CN",
        codigo_ncm: "55081000",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 5,
        valor_unitario_comercial: 4.5,
        valor_bruto: 22.5,
        unidade_tributavel: "CN",
        quantidade_tributavel: 5,
        valor_unitario_tributavel: 4.5,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 10,
        codigo_produto: "22698",
        descricao: "Retorno de JDS FIO TRICHE - COR: 16-0228 - JADE GREEN TC, TAM: 100 COR: 16-0228 - JADE GREEN TC CN",
        codigo_ncm: "54011012",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 3.792,
        valor_unitario_comercial: 5.5,
        valor_bruto: 20.86,
        unidade_tributavel: "CN",
        quantidade_tributavel: 3.792,
        valor_unitario_tributavel: 5.5,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 11,
        codigo_produto: "PARTRIDGE",
        descricao: "Retorno de FIO TRICHE - COR: 18-1124 - TC, TAM: 100 22698 COR: 18-1124 - PARTRIDGE TC CN",
        codigo_ncm: "54011012",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 3,
        valor_unitario_comercial: 5.5,
        valor_bruto: 16.5,
        unidade_tributavel: "CN",
        quantidade_tributavel: 3,
        valor_unitario_tributavel: 5.5,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 12,
        codigo_produto: "22698",
        descricao: "Retorno de FIO TRICHE - COR: 18-3918 - CHINA BLUE TC, TAM: 100 COR: 18-3918 - CHINA BLUE TC CN",
        codigo_ncm: "54011012",
        cfop: "5904",
        unidade_comercial: "CN",
        quantidade_comercial: 3,
        valor_unitario_comercial: 5.5,
        valor_bruto: 16.5,
        unidade_tributavel: "CN",
        quantidade_tributavel: 3,
        valor_unitario_tributavel: 5.5,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 13,
        codigo_produto: "ETIQUETA",
        descricao: "Retorno de RFID COS 01 COSTURADA CARLOTA COSTA - COR: UN 28999 11-0601 - BRIGHT WHITE TC, TAM: PADRAO COR: 11-0601 - BRI",
        codigo_ncm: "85235210",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 74,
        valor_unitario_comercial: 0.38,
        valor_bruto: 28.12,
        unidade_tributavel: "UN",
        quantidade_tributavel: 74,
        valor_unitario_tributavel: 0.38,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 14,
        codigo_produto: "ETIQUETA",
        descricao: "Retorno de TECIDO SIMONE SO8YI.01 TB0177113C - COR: 14-1310 - UN 201984 CAMEO ROSE TC, TAM: PADRAO COR: 14-1310 - CAMEO",
        codigo_ncm: "58071000",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 74,
        valor_unitario_comercial: 0.157,
        valor_bruto: 11.62,
        unidade_tributavel: "UN",
        quantidade_tributavel: 74,
        valor_unitario_tributavel: 0.157,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 15,
        codigo_produto: "ETIQUETA",
        descricao: "Retorno de COMP AMARO/ZINZANE/SAX/CARLOTA 34X120X03 UN 201999 TUBETE 3 - COR: 1 - PADRAO, TAM: PADRAO COR: 1 - PADRAO",
        codigo_ncm: "48211000",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 74,
        valor_unitario_comercial: 0.0225,
        valor_bruto: 1.67,
        unidade_tributavel: "UN",
        quantidade_tributavel: 74,
        valor_unitario_tributavel: 0.0225,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      },
      {
        numero_item: 16,
        codigo_produto: "CSV272552X",
        descricao: "Retorno de VESTIDO MIDO COM LENCO NA CINTURACSV272552X UN",
        codigo_ncm: "61044900",
        cfop: "5904",
        unidade_comercial: "UN",
        quantidade_comercial: 74,
        valor_unitario_comercial: 65.581,
        valor_bruto: 4852.99,
        unidade_tributavel: "UN",
        quantidade_tributavel: 74,
        valor_unitario_tributavel: 65.581,
        origem: 0,
        icms_origem: 0,
        icms_situacao_tributaria: "400",
        pis_situacao_tributaria: "08",
        cofins_situacao_tributaria: "08"
      }
    ],
    informacoes_adicionais_contribuinte: `Retorno de mercadoria recebida para industrializacao ref. NF-e Chave(s): ${chaveRemessa}. Nao incidencia de ICMS conf. legislacao estadual. Prestacao de servico tributada pelo Simples Nacional conf. LC 123/2006 (Anexo II - Industria).`
  };

  const valorTotalCalculado = payload.itens.reduce((acc: number, it: any) => acc + it.valor_bruto, 0);
  console.log(`Itens: ${payload.itens.length} | Valor Total: R$ ${valorTotalCalculado.toFixed(2)}`);
  console.log(`Referência Única: ${ref}`);

  // 4. Dispara requisição para a Focus NFe em PRODUÇÃO
  const authHeader = "Basic " + Buffer.from(tokenProducao + ":").toString("base64");
  console.log("\n📡 Transmitindo NF-e #106 para a Focus NFe (PRODUÇÃO)...");

  const urlEnvio = `https://api.focusnfe.com.br/v2/nfe?ref=${ref}`;
  const response = await fetch(urlEnvio, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const resJson: any = await response.json();
  console.log("Resposta Focus HTTP Status:", response.status);
  console.log("Resposta Focus Body:", JSON.stringify(resJson, null, 2));

  if (!response.ok && response.status !== 202) {
    throw new Error(`Falha ao transmitir NF-e: ${resJson.mensagem || JSON.stringify(resJson)}`);
  }

  // 5. Polling para obter autorização final da SEFAZ
  console.log("\n⏳ Aguardando processamento da SEFAZ (Polling)...");
  let statusFinal = resJson.status;
  let consultaData: any = resJson;

  for (let i = 0; i < 10; i++) {
    if (statusFinal === "autorizado" || statusFinal === "rejeitado" || statusFinal === "cancelado") {
      break;
    }
    console.log(`Tentativa ${i + 1}/10: Status atual = ${statusFinal}. Aguardando 3s...`);
    await sleep(3000);

    const consultaRes = await fetch(`https://api.focusnfe.com.br/v2/nfe/${ref}`, {
      headers: { Authorization: authHeader },
    });
    if (consultaRes.ok) {
      consultaData = await consultaRes.json();
      statusFinal = consultaData.status;
    }
  }

  console.log(`\n🏁 Status Final da NF-e #106: ${statusFinal.toUpperCase()}`);

  const chaveAutorizada = consultaData.chave_nfe || null;
  const caminhoDanfe = consultaData.caminho_danfe || null;
  const caminhoXml = consultaData.caminho_xml_nota_fiscal || null;
  const msgSefaz = consultaData.mensagem_sefaz || consultaData.erros || null;

  console.log("Chave de Acesso:", chaveAutorizada || "N/A");
  console.log("Mensagem SEFAZ:", msgSefaz || "Sem mensagem");

  // 6. Download dos Documentos Fiscais se autorizado
  let pdfUrl: string | null = null;
  let xmlUrl: string | null = null;

  const storageDir = path.resolve("./public/storage/invoices", tenant.id);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  if (statusFinal === "autorizado" && chaveAutorizada) {
    if (caminhoDanfe) {
      try {
        console.log("Baixando DANFE PDF de:", `https://api.focusnfe.com.br${caminhoDanfe}`);
        const pdfRes = await fetch(`https://api.focusnfe.com.br${caminhoDanfe}`, {
          headers: { Authorization: authHeader },
        });
        if (pdfRes.ok) {
          const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
          const pdfFileName = `${chaveAutorizada}.pdf`;
          const pdfFilePath = path.join(storageDir, pdfFileName);
          fs.writeFileSync(pdfFilePath, pdfBuffer);
          pdfUrl = `/storage/invoices/${tenant.id}/${pdfFileName}`;
          console.log("✅ PDF salvo em:", pdfUrl);
        }
      } catch (e: any) {
        console.error("Erro ao baixar PDF:", e.message);
      }
    }

    if (caminhoXml) {
      try {
        console.log("Baixando XML de:", `https://api.focusnfe.com.br${caminhoXml}`);
        const xmlRes = await fetch(`https://api.focusnfe.com.br${caminhoXml}`, {
          headers: { Authorization: authHeader },
        });
        if (xmlRes.ok) {
          const xmlText = await xmlRes.text();
          const xmlFileName = `${chaveAutorizada}.xml`;
          const xmlFilePath = path.join(storageDir, xmlFileName);
          fs.writeFileSync(xmlFilePath, xmlText, "utf-8");
          xmlUrl = `/storage/invoices/${tenant.id}/${xmlFileName}`;
          console.log("✅ XML salvo em:", xmlUrl);
        }
      } catch (e: any) {
        console.error("Erro ao baixar XML:", e.message);
      }
    }
  }

  // 7. Salva o Registro da Nota no Banco de Dados
  const statusDb = statusFinal === "autorizado"
    ? "AUTORIZADA"
    : statusFinal === "rejeitado"
    ? "REJEITADA"
    : "PENDENTE";

  const invoiceRecord = await prisma.invoice.create({
    data: {
      numero: 106,
      serie: 1,
      chaveAcesso: chaveAutorizada,
      tipo: "SAIDA",
      finalidade: "Retorno de mercadoria recebida para industrializacao (CFOP 5904)",
      modalidadeEmissao: "RETORNO_MERCADORIA",
      chaveNfeReferenciada: chaveRemessa,
      status: statusDb,
      valorTotal: valorTotalCalculado,
      dataEmissao: new Date(payload.data_emissao),
      xmlUrl: xmlUrl,
      pdfUrl: pdfUrl,
      focusNfeRef: ref,
      idempotencyKey: ref,
      rawJson: {
        payloadEnviado: payload,
        focusResponse: consultaData,
        ultimaConsultaFocus: consultaData,
        chaveAcessoEntrada: chaveRemessa,
      },
      tenantId: tenant.id,
      partnerId: partnerId,
    },
  });

  console.log(`\n🎉 Registro salvo no Banco de Dados com ID: ${invoiceRecord.id}`);

  // Se autorizada ou concluída, atualiza o próximo número da sequência fiscal
  if (statusDb === "AUTORIZADA") {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { proximoNumero: 107 },
    });
    console.log("✅ Sequência do Tenant atualizada: próximo número = 107");
  }

  console.log("==================================================================");
  console.log("🚀 [PROCESSO CONCLUÍDO COM SUCESSO!]");
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("❌ ERRO FATAL NA EXECUÇÃO:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
