import { ParsedNfe, ParsedNfeItem, ParsedTransporte } from "./xmlParser";
import { extractTextFromPdfBuffer } from "./pdfTextExtractor";
import { extractNfeKeyFromText } from "./nfeKey";

export async function parseDanfePdf(
  pdfBuffer: Buffer,
  fallbackDestinatario?: {
    cnpj?: string;
    razaoSocial?: string;
    ie?: string;
  }
): Promise<ParsedNfe> {
  let text = "";
  try {
    text = await extractTextFromPdfBuffer(pdfBuffer);
  } catch (err: any) {
    throw new Error(`Falha ao ler conteúdo do PDF da NF-e: ${err.message}`);
  }

  if (!text || text.trim().length === 0) {
    throw new Error("O arquivo PDF fornecido está vazio ou não contém texto legível (imagem digitalizada).");
  }

  // 1. Chave de Acesso (44 dígitos numéricos validados via Módulo 11 SEFAZ)
  const chaveAcesso = extractNfeKeyFromText(text);
  if (!chaveAcesso || chaveAcesso.length !== 44) {
    throw new Error(
      "Não foi possível localizar a Chave de Acesso de 44 dígitos no DANFE. Verifique se o documento é uma NF-e válida."
    );
  }

  // 2. Extrai Número e Série da NF-e
  // Tenta pelo texto ou extrai com 100% de precisão das posições oficiais da Chave de Acesso SEFAZ
  // Chave: UFAAMM[CNPJ 14 dig][Mod 2 dig][Serie 3 dig][Numero 9 dig][TpEmi 1][Cod 8][DV 1]
  let serie = parseInt(chaveAcesso.substring(22, 25), 10) || 1;
  let numero = parseInt(chaveAcesso.substring(25, 34), 10);

  const numMatch = text.match(/N[º°\.]?\s*(\d{1,9})[\s\S]*?S[ÉÉR]IE\s*(\d{1,3})/i);
  if (numMatch && numMatch[1]) {
    const parsedNum = parseInt(numMatch[1].replace(/\./g, ""), 10);
    if (parsedNum > 0) numero = parsedNum;
    if (numMatch[2]) {
      const parsedSerie = parseInt(numMatch[2], 10);
      if (parsedSerie > 0) serie = parsedSerie;
    }
  }

  // 3. Data de Emissão
  let dataEmissao = new Date();
  const dataMatch = text.match(/DATA DA EMISS[AÃ]O[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/(\d{2}\/\d{2}\/\d{4})\s*[\s\S]*?DATA/i);
  if (dataMatch) {
    const parts = dataMatch[1].split("/");
    if (parts.length === 3) {
      dataEmissao = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }

  // 4. Natureza da Operação
  let naturezaOperacao = "REMESSA PARA INDUSTRIALIZACAO";
  const natMatch = text.match(/NATUREZA DA OPERA[CÇ][AÃ]O\s*\n\s*([^\n]+)/i);
  if (natMatch && natMatch[1]) {
    naturezaOperacao = natMatch[1].trim();
  }

  // 5. Emitente (Fábrica Parceira)
  // CNPJ da fábrica está nas posições 6 a 20 da Chave de Acesso
  const cnpjEmitenteRaw = chaveAcesso.substring(6, 20);
  let razaoSocialEmitente = "Fábrica Parceira";
  if (text.includes("RITMI CONFECCOES") || text.includes("RITMI")) {
    razaoSocialEmitente = "RITMI CONFECCOES LTDA";
  } else {
    const emitNomeMatch = text.match(/(?:IDENTIFICA[CÇ][AÃ]O DO EMITENTE|DANFE)[\s\S]*?\n\s*([A-Z0-9\s\.\-]{3,60})\s*\n/i);
    if (emitNomeMatch && emitNomeMatch[1]) {
      razaoSocialEmitente = emitNomeMatch[1].trim();
    }
  }

  // Inscrição Estadual do Emitente
  let ieEmitente: string | undefined = undefined;
  const ieEmitMatch = text.match(/INSCRI[CÇ][AÃ]O ESTADUAL\s*(\d{7,14})/i);
  if (ieEmitMatch) {
    ieEmitente = ieEmitMatch[1].trim();
  } else if (cnpjEmitenteRaw === "72305295000115") {
    ieEmitente = "252740106";
  }

  // Endereço do Emitente
  let logradouroEmitente = "RODOVIA SO 350 - ANTONIO LIVINO F";
  let numeroEmitente = "200";
  let bairroEmitente = "NOVA GUARITA";
  let municipioEmitente = "SOMBRIO";
  let ufEmitente = "SC";
  let cepEmitente = "88960-000";
  let telefoneEmitente = "4835336300";

  // Se for emitente genérico, tenta extrair
  if (cnpjEmitenteRaw !== "72305295000115") {
    const endMatch = text.match(/([A-Z\s]+,\s*\d+[\s\S]*?-\s*[A-Z\s]+-\s*SC)/i);
    const munMatch = text.match(/-\s*([A-Z\s]+)\s*-\s*([A-Z]{2})\s*Fone/i);
    if (munMatch) {
      municipioEmitente = munMatch[1].trim();
      ufEmitente = munMatch[2].trim();
    }
  }

  // 6. Destinatário (Oficina / Cliente)
  let cnpjDestinatario = fallbackDestinatario?.cnpj?.replace(/\D/g, "") || "";
  let razaoSocialDestinatario = fallbackDestinatario?.razaoSocial || "Oficina Destinatária";
  let ieDestinatario = fallbackDestinatario?.ie || undefined;

  const destCnpjMatch = text.match(/DESTINAT[AÁ]RIO[\s\S]*?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
  if (destCnpjMatch) {
    cnpjDestinatario = destCnpjMatch[1].replace(/\D/g, "");
  }

  const destNomeMatch = text.match(/DESTINAT[AÁ]RIO[\s\S]*?NOME\s*\/\s*RAZ[AÃ]O SOCIAL\s*\n\s*([^\n]+)/i);
  if (destNomeMatch && destNomeMatch[1]) {
    razaoSocialDestinatario = destNomeMatch[1].trim();
  }

  const destIeMatch = text.match(/DESTINAT[AÁ]RIO[\s\S]*?INSCRI[CÇ][AÃ]O ESTADUAL\s*([0-9]{7,14}|ISENTO)/i);
  if (destIeMatch && destIeMatch[1] !== "ISENTO") {
    ieDestinatario = destIeMatch[1].trim();
  }

  // 7. Extração dos Itens da NF-e com ordenação física por página
  const itens: ParsedNfeItem[] = [];
  const pages = text.split(/----------------Page Break----------------/i);

  for (const page of pages) {
    const lines = page.split("\n").map((l) => l.trim()).filter(Boolean);

    let inProductSection = false;
    let pendingDescLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Identifica o início da seção de produtos nesta página
      if (!inProductSection) {
        if (
          line.includes("DADOS DOS PRODUTOS") ||
          (line.includes("CÓDIGO") && line.includes("DESCRIÇÃO") && line.includes("NCM"))
        ) {
          inProductSection = true;
        }
        continue;
      }

      // Identifica o fim da seção de produtos desta página
      if (
        line.startsWith("DADOS ADICIONAIS") ||
        line.startsWith("INFORMAÇÕES COMPLEMENTARES") ||
        line.startsWith("CÁLCULO DO ISSQN") ||
        line.startsWith("TRANSPORTADOR/VOLUMES") ||
        line.startsWith("CÁLCULO DO IMPOSTO")
      ) {
        break;
      }

      // Ignora repetições de cabeçalhos de coluna
      if (
        line.includes("DADOS DOS PRODUTOS") ||
        line.includes("CÓDIGO PRODUTO") ||
        line.includes("DESCRIÇÃO DO PRODUTO") ||
        line.includes("NCM/SH CST CFOP") ||
        line.includes("CÓDIGO ORIG VALOR")
      ) {
        continue;
      }

      // Linha de item fiscal com NCM (8 dígitos) e CFOP (5901, 5902, 5904, 6901, etc.)
      const ncmCfopMatch = line.match(/\b(\d{8})\s+(\d{3})\s+([56]\d{3})\b/);

      if (ncmCfopMatch) {
        const matchIndex = ncmCfopMatch.index || 0;
        const ncm = ncmCfopMatch[1];
        const cfop = ncmCfopMatch[3];

        const afterCfop = line.substring(matchIndex + ncmCfopMatch[0].length);
        const valuesMatch = afterCfop.match(
          /([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)(?:\s+0,00|\s*$)/
        );

        if (valuesMatch) {
          const quantidade = parseFloat(valuesMatch[1].replace(/\./g, "").replace(",", "."));
          const valorUnitario = parseFloat(valuesMatch[2].replace(/\./g, "").replace(",", "."));
          const valorTotal = parseFloat(valuesMatch[3].replace(/\./g, "").replace(",", "."));

          let unidade = "UN";
          const unMatch = line.match(/\b(UN|PC|CN|M|MT|KG|RL|PÇA)\b/i);
          if (unMatch) {
            unidade = unMatch[1].toUpperCase();
          }

          const prefixOnLine = line.substring(0, matchIndex).trim();
          const middleText = afterCfop.substring(0, valuesMatch.index || 0).trim();

          let rawCombinedText = [...pendingDescLines, prefixOnLine, middleText]
            .filter(Boolean)
            .join(" ")
            .replace(/\bID\b/g, "")
            .replace(/\s+/g, " ")
            .trim();

          pendingDescLines = [];

          let codigo = "";
          let descricao = rawCombinedText;

          // Se começa com código (ex: "CSV272552X", "20017", "22698")
          const startCode = rawCombinedText.match(/^([A-Z0-9\-\.\/]{3,20})\b/i);
          if (startCode && !startCode[1].match(/^(COR|TAM|UN|PC|CN|JDS|M|MT|FIO|LINHA|ZIPER|ETIQUETA)$/i)) {
            codigo = startCode[1];
            descricao = rawCombinedText.substring(codigo.length).trim();
          } else {
            const isolatedCode = rawCombinedText.match(/\b([0-9]{5,7}|[A-Z0-9]{8,15})\b/);
            if (isolatedCode && !isolatedCode[1].match(/^(PADRAO|BRIGHT|WHITE|NOVO|SANCRIS)$/i)) {
              codigo = isolatedCode[1];
              descricao = rawCombinedText.replace(codigo, "").replace(/\s+/g, " ").trim();
            }
          }

          // Limpeza de texto: remove repetições de tamanho/cor no início
          descricao = descricao
            .replace(/^(?:TAM:\s*PADRAO\s*|TAM:\s*\d+\s*)/i, "")
            .replace(/^(?:COR:\s*[^,]+,\s*)?/i, "")
            .replace(/\s+/g, " ")
            .trim();

          if (codigo && descricao.endsWith(codigo)) {
            descricao = descricao.substring(0, descricao.length - codigo.length).trim();
          }

          itens.push({
            numeroItem: itens.length + 1,
            codigo: codigo || `ITEM-${itens.length + 1}`,
            descricao: descricao || `Produto ${codigo}`,
            ncm,
            cfop,
            unidade,
            quantidade,
            valorUnitario,
            valorTotal,
          });
          continue;
        }
      }

      // Linha descritiva adicional pertencente ao próximo item
      pendingDescLines.push(line);
    }
  }

  // 8. Valor Total da Nota
  const somaItens = itens.reduce((acc, it) => acc + (it.valorTotal || 0), 0);
  let valorTotal = somaItens > 0 ? parseFloat(somaItens.toFixed(2)) : 0;

  const valorRodapeMatch =
    text.match(/VALOR TOTAL DA NOTA[\s\S]*?([\d\.]+,\d{2})/i) ||
    text.match(/VALOR TOTAL DOS PRODUTOS[\s\S]*?([\d\.]+,\d{2})/i) ||
    text.match(/VALOR TOTAL:\s*([\d\.]+,\d{2})/i);

  if (valorRodapeMatch) {
    const rodapeVal = parseFloat(valorRodapeMatch[1].replace(/\./g, "").replace(",", "."));
    if (rodapeVal > 0 && Math.abs(rodapeVal - somaItens) <= 0.05) {
      valorTotal = rodapeVal;
    } else if (valorTotal === 0 && rodapeVal > 0) {
      valorTotal = rodapeVal;
    }
  }


  // 9. Extração de Transporte e Volumes
  let transporte: ParsedTransporte | undefined = undefined;
  const lines = text.split(/\r?\n/);
  const tIdx = lines.findIndex(
    (l) => l.includes("TRANSPORTADOR/VOLUMES") || l.includes("TRANSPORTADOR")
  );

  let modalidadeFrete = "0";
  let transpNome: string | undefined = undefined;
  let transpCnpj: string | undefined = undefined;
  let transpIe: string | undefined = undefined;
  let transpEnd: string | undefined = undefined;
  let transpMun: string | undefined = undefined;
  let transpUf: string | undefined = undefined;
  let transpPlaca: string | undefined = undefined;

  let qtdVolumes: number | undefined = undefined;
  let especieVolumes: string | undefined = undefined;
  let pesoBruto: number | undefined = undefined;
  let pesoLiquido: number | undefined = undefined;

  if (tIdx !== -1) {
    const chunkLines = lines.slice(
      Math.max(0, tIdx - 8),
      Math.min(lines.length, tIdx + 8)
    );

    for (const line of chunkLines) {
      const freteM = line.match(
        /([0-9])\s*-\s*(?:EMITENTE|DESTINAT[AÁ]RIO|TERCEIROS|SEM\s+FRETE|REMETENTE|PR[OÓ]PRIO)/i
      );
      if (freteM) modalidadeFrete = freteM[1];

      // Linha do nome e CNPJ da transportadora
      const nomeCnpjM = line.match(
        /^\s*([A-Z0-9\s\.\-]{3,60})\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i
      );
      if (
        nomeCnpjM &&
        !nomeCnpjM[1].includes("NOME") &&
        !nomeCnpjM[1].includes("ENDEREÇO")
      ) {
        transpNome = nomeCnpjM[1].trim();
        transpCnpj = nomeCnpjM[2].replace(/\D/g, "");
      }

      // Linha do endereço, município, UF e IE da transportadora
      const endM = line.match(
        /^\s*([A-Z0-9\s\.\-\,]{5,50})\s+([A-Z\s]{3,30})\s+(SC|SP|PR|RS|MG|RJ|GO|BA|CE|PE)\s+(\d{7,14})/i
      );
      if (endM && !endM[1].includes("QUANTIDADE") && !endM[1].includes("DADOS")) {
        transpEnd = endM[1].trim();
        transpMun = endM[2].trim();
        transpUf = endM[3].trim();
        transpIe = endM[4].trim();
      }

      // Linha de volumes
      const volM = line.match(
        /(\d+)\s+([A-Z]{2,10})\s+[\s\S]*?([\d\.]+,\d{2,3})\s+([\d\.]+,\d{2,3})/
      );
      if (volM) {
        qtdVolumes = parseInt(volM[1], 10);
        especieVolumes = volM[2].trim();
        pesoBruto = parseFloat(volM[3].replace(/\./g, "").replace(",", "."));
        pesoLiquido = parseFloat(volM[4].replace(/\./g, "").replace(",", "."));
      }
    }

    transporte = {
      modalidadeFrete,
      transportador:
        transpNome || transpCnpj
          ? {
              razaoSocial: transpNome,
              cnpj: transpCnpj,
              inscricaoEstadual: transpIe,
              endereco: transpEnd,
              municipio: transpMun,
              uf: transpUf,
              placa: transpPlaca,
            }
          : undefined,
      volumes:
        qtdVolumes || pesoBruto || pesoLiquido
          ? {
              quantidade: qtdVolumes,
              especie: especieVolumes || "VOLUMES",
              pesoBruto,
              pesoLiquido,
            }
          : undefined,
    };
  }

  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    valorTotal,
    naturezaOperacao,
    emitente: {
      cnpj: cnpjEmitenteRaw,
      razaoSocial: razaoSocialEmitente,
      nomeFantasia: razaoSocialEmitente.includes("RITMI") ? "RITMI" : undefined,
      inscricaoEstadual: ieEmitente,
      logradouro: logradouroEmitente,
      numero: numeroEmitente,
      bairro: bairroEmitente,
      municipio: municipioEmitente,
      uf: ufEmitente,
      cep: cepEmitente,
      telefone: telefoneEmitente,
    },
    destinatario: {
      cnpj: cnpjDestinatario,
      razaoSocial: razaoSocialDestinatario,
      inscricaoEstadual: ieDestinatario,
    },
    itens,
    transporte,
  };
}
