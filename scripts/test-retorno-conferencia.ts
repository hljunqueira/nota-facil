import { calculateRetornoConferencia } from "../src/lib/services/inversion";

async function runTest() {
  console.log("================================================================");
  console.log("🧪 [TESTE DE CONFERÊNCIA & PRÉ-VISUALIZAÇÃO DE RETORNO]");
  console.log("================================================================");

  const mockNotaEntrada = {
    id: "inv_entrada_1",
    numero: 238590,
    serie: 1,
    chaveAcesso: "42260972305295000115550010002385901023122312",
    valorTotal: 5000,
    dataEmissao: new Date("2026-09-20"),
    partner: {
      razaoSocial: "RITMI CONFECCOES LTDA",
      cnpj: "72305295000115",
      municipio: "SOMBRIO",
      uf: "SC",
    },
    rawJson: {
      itens: [
        {
          numeroItem: 1,
          codigo: "VEST01",
          descricao: "VESTIDO MIDI",
          ncm: "61044900",
          unidade: "UN",
          quantidade: 74,
          valorUnitario: 65,
          valorTotal: 4810,
        },
        {
          numeroItem: 2,
          codigo: "ZIP01",
          descricao: "ZIPER NYLON",
          ncm: "96071900",
          unidade: "UN",
          quantidade: 74,
          valorUnitario: 1,
          valorTotal: 74,
        },
      ],
    },
  };

  // Teste 1: Retorno Parcial (30 peças devolvidas na NF 104)
  console.log("\n1. Testando cálculo de Retorno Parcial...");
  const mockSaidasParcial = [
    {
      id: "inv_saida_104",
      numero: 104,
      serie: 1,
      chaveAcesso: "42261000168223000162550010000001041000000015",
      status: "AUTORIZADA",
      dataEmissao: new Date("2026-10-01"),
      valorTotal: 2000,
      pdfUrl: "https://storage.exemplo/danfe104.pdf",
      xmlUrl: null,
      rawJson: {
        payloadEnviado: {
          itens: [
            {
              codigo_produto: "VEST01",
              descricao: "Retorno de VESTIDO MIDI",
              quantidade_comercial: 30,
              valor_unitario_comercial: 65,
              valor_bruto: 1950,
            },
            {
              codigo_produto: "ZIP01",
              descricao: "Retorno de ZIPER NYLON",
              quantidade_comercial: 30,
              valor_unitario_comercial: 1,
              valor_bruto: 30,
            },
          ],
        },
      },
    },
  ];

  const confParcial = calculateRetornoConferencia(mockNotaEntrada as any, mockSaidasParcial as any);
  console.log("Resultado Parcial:", {
    statusGeral: confParcial.resumo.statusGeral,
    totalPecasEntrada: confParcial.resumo.totalPecasEntrada,
    totalPecasDevolvidas: confParcial.resumo.totalPecasDevolvidas,
    saldoPecasRestante: confParcial.resumo.saldoPecasRestante,
    tudoCerto: confParcial.resumo.tudoCerto,
  });

  if (confParcial.resumo.statusGeral !== "PARCIAL") {
    throw new Error(`Esperado status PARCIAL, obtido: ${confParcial.resumo.statusGeral}`);
  }
  if (confParcial.resumo.saldoPecasRestante !== 44) {
    throw new Error(`Esperado saldo de 44 peças, obtido: ${confParcial.resumo.saldoPecasRestante}`);
  }
  if (confParcial.resumo.tudoCerto !== false) {
    throw new Error("tudoCerto deve ser false em retorno parcial!");
  }
  console.log("✅ Teste 1 (Retorno Parcial) aprovado!");

  // Teste 2: Retorno Total (Completando as 44 peças restantes na NF 105)
  console.log("\n2. Testando cálculo de Retorno Total...");
  const mockSaidasTotal = [
    ...mockSaidasParcial,
    {
      id: "inv_saida_105",
      numero: 105,
      serie: 1,
      chaveAcesso: "42261000168223000162550010000001051000000016",
      status: "AUTORIZADA",
      dataEmissao: new Date("2026-10-02"),
      valorTotal: 3000,
      pdfUrl: "https://storage.exemplo/danfe105.pdf",
      xmlUrl: null,
      rawJson: {
        payloadEnviado: {
          itens: [
            {
              codigo_produto: "VEST01",
              descricao: "Retorno de VESTIDO MIDI",
              quantidade_comercial: 44,
              valor_unitario_comercial: 65,
              valor_bruto: 2860,
            },
            {
              codigo_produto: "ZIP01",
              descricao: "Retorno de ZIPER NYLON",
              quantidade_comercial: 44,
              valor_unitario_comercial: 1,
              valor_bruto: 44,
            },
          ],
        },
      },
    },
  ];

  const confTotal = calculateRetornoConferencia(mockNotaEntrada as any, mockSaidasTotal as any);
  console.log("Resultado Total:", {
    statusGeral: confTotal.resumo.statusGeral,
    totalPecasDevolvidas: confTotal.resumo.totalPecasDevolvidas,
    saldoPecasRestante: confTotal.resumo.saldoPecasRestante,
    tudoCerto: confTotal.resumo.tudoCerto,
  });

  if (confTotal.resumo.statusGeral !== "CONCLUIDO") {
    throw new Error(`Esperado status CONCLUIDO, obtido: ${confTotal.resumo.statusGeral}`);
  }
  if (confTotal.resumo.saldoPecasRestante !== 0) {
    throw new Error(`Esperado saldo 0, obtido: ${confTotal.resumo.saldoPecasRestante}`);
  }
  if (confTotal.resumo.tudoCerto !== true) {
    throw new Error("tudoCerto deve ser true em retorno concluído!");
  }
  console.log("✅ Teste 2 (Retorno Total / Tudo Certo) aprovado!");

  // Teste 3: Retorno com Rejeição SEFAZ
  console.log("\n3. Testando detecção de Rejeição SEFAZ...");
  const mockSaidasRejeitada = [
    {
      id: "inv_saida_106",
      numero: 106,
      serie: 1,
      chaveAcesso: null,
      status: "REJEITADA",
      dataEmissao: new Date("2026-10-05"),
      valorTotal: 5000,
      pdfUrl: null,
      xmlUrl: null,
      rawJson: {
        ultimaConsultaFocus: {
          mensagem_sefaz: "Rejeicao: Chave de Acesso referenciada inexistente",
        },
      },
    },
  ];

  const confRejeitada = calculateRetornoConferencia(mockNotaEntrada as any, mockSaidasRejeitada as any);
  console.log("Resultado Rejeitado:", {
    statusGeral: confRejeitada.resumo.statusGeral,
    mensagem: confRejeitada.resumo.mensagemDiagnostico,
  });

  if (confRejeitada.resumo.statusGeral !== "ERRO_SEFAZ") {
    throw new Error(`Esperado ERRO_SEFAZ, obtido: ${confRejeitada.resumo.statusGeral}`);
  }
  if (!confRejeitada.resumo.mensagemDiagnostico.includes("Chave de Acesso referenciada inexistente")) {
    throw new Error("Mensagem de erro SEFAZ não foi capturada!");
  }
  console.log("✅ Teste 3 (Rejeição SEFAZ) aprovado!");

  console.log("\n================================================================");
  console.log("🎉 [TODOS OS TESTES DE CONFERÊNCIA PASSARAM COM SUCESSO!]");
  console.log("================================================================");
}

runTest().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
