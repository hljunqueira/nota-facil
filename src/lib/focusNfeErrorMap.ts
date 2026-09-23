/**
 * Dicionário de Erros e Rejeições Fiscais SEFAZ / Focus NFe
 * Traduz códigos técnicos e rejeições herméticas da SEFAZ em orientações
 * claras, objetivas e práticas para o gestor e operador da oficina de costura.
 */

export interface HumanizedFiscalError {
  codigo: string;
  titulo: string;
  descricao: string;
  comoResolver: string;
  gravidade: "ERRO" | "AVISO" | "INFO";
  detalheTecnico?: string;
}

interface KnownErrorPattern {
  padroes: Array<string | RegExp>;
  titulo: string;
  descricao: string;
  comoResolver: string;
  gravidade: "ERRO" | "AVISO" | "INFO";
}

const KNOWN_FISCAL_ERRORS: KnownErrorPattern[] = [
  {
    padroes: ["539", "204", /duplicidade de nf-e/i, /duplicidade/i],
    titulo: "Número de Nota Fiscal Já Utilizado",
    descricao:
      "A SEFAZ rejeitou a emissão porque o número e a série desta nota já foram emitidos anteriormente por outra NF-e autorizada da sua confecção.",
    comoResolver:
      "Acesse 'Configurações' no menu lateral e aumente o 'Próximo Número da NF-e'. Em seguida, repita a emissão.",
    gravidade: "ERRO",
  },
  {
    padroes: ["232", /ie do destinatario/i, /inscricao estadual.*destinatario/i],
    titulo: "Inscrição Estadual da Fábrica Incorreta",
    descricao:
      "A Inscrição Estadual (IE) cadastrada para a fábrica parceira não está ativa ou não confere com o CNPJ no cadastro da SEFAZ do estado de destino.",
    comoResolver:
      "Consulte o Sintegra ou o Cadastro Centralizado (CCC) da fábrica parceira e atualize a Inscrição Estadual no cadastro de parceiros.",
    gravidade: "ERRO",
  },
  {
    padroes: ["280", "281", "284", "285", "286", /certificado transmissor/i, /certificado.*expirado/i, /certificado.*revogado/i],
    titulo: "Certificado Digital A1 com Problemas",
    descricao:
      "O Certificado Digital A1 da sua confecção está expirado, foi revogado ou a senha informada não confere na validação com a SEFAZ.",
    comoResolver:
      "Solicite ao administrador da plataforma para reenviar o arquivo .pfx e a senha atualizada do seu certificado A1.",
    gravidade: "ERRO",
  },
  {
    padroes: ["225", "215", /schema xml/i, /falha no schema/i],
    titulo: "Inconsistência no Formato dos Dados Fiscais",
    descricao:
      "A SEFAZ identificou algum campo de produto com formato incompatível (ex: NCM inexistente, unidade de medida ou quantidade com formato inválido).",
    comoResolver:
      "Verifique se o NCM dos produtos da remessa original está correto e confira a quantidade de peças digitada.",
    gravidade: "ERRO",
  },
  {
    padroes: ["208", /usuario nao tem permissao/i, /empresa nao habilitada/i],
    titulo: "Confecção Não Credenciada para Emissão na SEFAZ",
    descricao:
      "A Secretaria da Fazenda do seu estado ainda não autorizou o seu CNPJ para emitir Notas Fiscais Eletrônicas em ambiente de produção.",
    comoResolver:
      "Entre em contato com sua contabilidade para verificar o credenciamento de NF-e junto ao Posto Fiscal da SEFAZ do seu estado.",
    gravidade: "ERRO",
  },
  {
    padroes: ["508", "507", /cst incompativel/i, /csosn incompativel/i],
    titulo: "Regime Tributário Incompatível",
    descricao:
      "O Código de Situação Tributária (CST/CSOSN) gerado não é aceito pela SEFAZ para esta combinação de remessa e retorno industrial.",
    comoResolver:
      "Revise as 'Regras de CFOP' nas Configurações da confecção ou consulte sua contabilidade para confirmar a tributação do Simples Nacional.",
    gravidade: "ERRO",
  },
  {
    padroes: ["531", "532", "533", "610", /total da nf-e difere/i, /difere do somatorio/i],
    titulo: "Divergência nos Totais da Nota Fiscal",
    descricao:
      "A soma das peças e serviços diverge do valor total final da nota fiscal por alguns centavos de arredondamento.",
    comoResolver:
      "Revise o espelho de conferência e retransmita a nota para que o sistema recalcule os centavos automaticamente.",
    gravidade: "AVISO",
  },
  {
    padroes: ["cancelamento_fora_do_prazo", "218", "prazo_cancelamento", /fora do prazo/i, /prazo de cancelamento/i],
    titulo: "Prazo de Cancelamento Expirado (24 Horas)",
    descricao:
      "A SEFAZ só permite o cancelamento oficial de notas fiscais em até 24 horas após a autorização.",
    comoResolver:
      "Para anular a operação após as 24h regulamentares, solicite à fábrica parceira ou emita uma Nota Fiscal de Entrada de estorno/devolução.",
    gravidade: "AVISO",
  },
  {
    padroes: [/empresa_sem_certificado/i, /sem certificado/i],
    titulo: "Certificado Digital Não Configurado",
    descricao:
      "Sua confecção ainda não possui um Certificado Digital A1 ativo conectado ao sistema fiscal.",
    comoResolver:
      "Acesse as configurações ou contate o suporte administrativo para realizar o upload do certificado A1 da sua confecção.",
    gravidade: "ERRO",
  },
];

/**
 * Traduz qualquer código ou mensagem bruta de erro da SEFAZ / Focus NFe
 * em um objeto amigável e estruturado para exibição na interface do usuário.
 */
export function translateFocusNfeError(
  rawInput: any,
  codigoSefaz?: string | number
): HumanizedFiscalError {
  const rawText =
    typeof rawInput === "string"
      ? rawInput
      : rawInput?.mensagem_sefaz ||
        rawInput?.mensagem ||
        rawInput?.erros ||
        rawInput?.error ||
        JSON.stringify(rawInput || "");

  const codeStr = String(codigoSefaz || rawInput?.status_sefaz || "");

  // Tenta casar com padrões conhecidos
  for (const item of KNOWN_FISCAL_ERRORS) {
    const matched = item.padroes.some((p) => {
      if (typeof p === "string") {
        return (
          codeStr === p ||
          rawText.toLowerCase().includes(p.toLowerCase())
        );
      }
      return p.test(rawText) || p.test(codeStr);
    });

    if (matched) {
      return {
        codigo: codeStr || "SEFAZ",
        titulo: item.titulo,
        descricao: item.descricao,
        comoResolver: item.comoResolver,
        gravidade: item.gravidade,
        detalheTecnico: rawText,
      };
    }
  }

  // Fallback para mensagens genéricas não catalogadas
  const cleanMessage = rawText
    .replace(/^\{[\s\S]*\}$/, "")
    .replace(/\[Rejeição \d+\]:?\s*/i, "")
    .trim();

  return {
    codigo: codeStr || "SEFAZ",
    titulo: "Rejeição Fiscal da SEFAZ",
    descricao: cleanMessage || "A SEFAZ apontou uma inconsistência durante a validação da nota fiscal.",
    comoResolver:
      "Revise os dados da fábrica parceira e dos itens, ou entre em contato com o suporte técnico com o código de detalhe abaixo.",
    gravidade: "ERRO",
    detalheTecnico: rawText,
  };
}
