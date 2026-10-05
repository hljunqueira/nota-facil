import { buildFocusNfePayload } from "../src/lib/services/inversion";
import { translateFocusNfeError } from "../src/lib/focusNfeErrorMap";

async function runTest() {
  console.log("================================================================");
  console.log("🧪 [TESTE DE TRANSPORTE & BLINDAGEM SEFAZ]");
  console.log("================================================================");

  const mockTenant = {
    id: "tenant_1",
    cnpj: "00.168.223/0001-62",
    proximoNumero: 105,
    serieNfe: 1,
    uf: "SC",
  };

  const mockPartnerRitmi = {
    id: "partner_ritmi",
    razaoSocial: "RITMI CONFECCOES LTDA",
    cnpj: "72.305.295/0001-15",
    inscricaoEstadual: "252740106",
    logradouro: "RODOVIA SO 350 - ANTONIO LIVINO F",
    numero: "200",
    bairro: "NOVA GUARITA",
    municipio: "SOMBRIO",
    uf: "SC",
    cep: "88960000",
  };

  const mockItem = [
    {
      numeroItem: 1,
      codigo: "001",
      descricao: "PECA TESTE",
      ncm: "61091000",
      cfopEntradaOriginal: "5901",
      cfopSaida: "5902",
      unidadeMedida: "PC",
      unidade: "PC",
      quantidade: 10,
      valorUnitario: 5,
      valorTotal: 50,
    },
  ];

  // Cenário 1: Transporte da própria Ritmi sem UF explícita no transportador
  console.log("\n1. Testando frete da própria Ritmi sem UF explícita...");
  const payload1 = buildFocusNfePayload({
    tenant: mockTenant,
    partner: mockPartnerRitmi,
    chaveAcessoEntrada: "42240172305295000115550010000001051000000000",
    itensRetorno: mockItem,
    transporteInfo: {
      modalidadeFrete: "4",
      transportador: {
        razaoSocial: "RITMI CONFECCOES LTDA",
        cnpj: "72.305.295/0001-15",
      },
      volumes: {
        quantidade: 5,
        especie: "VOLUMES",
        pesoBruto: 20,
        pesoLiquido: 19,
      },
    },
  });

  console.log("Payload Gerado (Transporte):", {
    modalidade_frete: payload1.modalidade_frete,
    nome_transportador: payload1.nome_transportador,
    uf_transportador: payload1.uf_transportador,
    municipio_transportador: payload1.municipio_transportador,
  });

  if (payload1.nome_transportador && !payload1.uf_transportador) {
    throw new Error("❌ FALHA: nome_transportador enviado sem uf_transportador! SEFAZ rejeitará!");
  }
  if (payload1.uf_transportador !== "SC") {
    throw new Error(`❌ FALHA: UF esperada 'SC', obtido '${payload1.uf_transportador}'`);
  }
  console.log("✅ Cenário 1 aprovado: UF auto-preenchida para a Ritmi!");

  // Cenário 2: Modalidade 4 (Próprio Destinatário) com transportador desconhecido sem UF
  console.log("\n2. Testando Modalidade 4 com transportador sem UF que não deve quebrar a SEFAZ...");
  const payload2 = buildFocusNfePayload({
    tenant: mockTenant,
    partner: { ...mockPartnerRitmi, cnpj: "99.999.999/0001-99", razaoSocial: "OUTRA FABRICA" },
    chaveAcessoEntrada: "42240172305295000115550010000001051000000000",
    itensRetorno: mockItem,
    transporteInfo: {
      modalidadeFrete: "4",
      transportador: {
        razaoSocial: "MOTORISTA DESCONHECIDO",
      },
    },
  });

  if (payload2.nome_transportador && !payload2.uf_transportador) {
    throw new Error("❌ FALHA: nome_transportador enviado sem uf_transportador no Cenário 2!");
  }
  console.log("✅ Cenário 2 aprovado: blindagem ativa sem UF órfã!");

  // Cenário 3: Tradução do Erro SEFAZ "Rejeicao: UF do Transportador nao informado"
  console.log("\n3. Testando dicionário de erros para a rejeição da SEFAZ...");
  const errTranslation = translateFocusNfeError("Rejeicao: UF do Transportador nao informado");
  console.log("Tradução Humanizada:", errTranslation);

  if (!errTranslation.titulo.includes("UF do Transportador")) {
    throw new Error(`❌ FALHA: Título inesperado: ${errTranslation.titulo}`);
  }
  if (!errTranslation.comoResolver.includes("Ritmi") && !errTranslation.comoResolver.includes("Transporte Próprio")) {
    throw new Error(`❌ FALHA: Orientação não menciona Ritmi/Transporte Próprio: ${errTranslation.comoResolver}`);
  }
  console.log("✅ Cenário 3 aprovado: Erro humanizado com orientações precisas!");

  console.log("\n================================================================");
  console.log("🎉 [TODOS OS TESTES DE TRANSPORTE PASSARAM COM SUCESSO!]");
  console.log("================================================================");
}

runTest().catch((err) => {
  console.error("ERRO:", err);
  process.exit(1);
});
