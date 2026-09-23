/**
 * Parser de XML de NF-e (SEFAZ) para Importação e Inversão em 1 Clique
 */

export interface ParsedNfeItem {
  numeroItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface ParsedTransporte {
  modalidadeFrete?: string; // "0" | "1" | "2" | "3" | "4" | "9"
  transportador?: {
    razaoSocial?: string;
    cnpj?: string;
    inscricaoEstadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
    placa?: string;
    ufVeiculo?: string;
  };
  volumes?: {
    quantidade?: number;
    especie?: string;
    marca?: string;
    numero?: string;
    pesoBruto?: number;
    pesoLiquido?: number;
  };
}

export interface ParsedNfe {
  chaveAcesso: string;
  numero: number;
  serie: number;
  dataEmissao: Date;
  valorTotal: number;
  naturezaOperacao: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    inscricaoEstadual?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    telefone?: string;
  };
  destinatario: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual?: string;
  };
  itens: ParsedNfeItem[];
  transporte?: ParsedTransporte;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

export function parseNfeXml(xmlContent: string): ParsedNfe {
  // 1. Chave de acesso
  let chaveAcesso = "";
  const idMatch = xmlContent.match(/Id=["']NFe(\d{44})["']/i);
  if (idMatch) {
    chaveAcesso = idMatch[1];
  } else {
    chaveAcesso = extractTag(xmlContent, "chNFe") || "";
  }

  // 2. Dados de identificação (<ide>)
  const ideBlock = extractTag(xmlContent, "ide");
  const numero = parseInt(extractTag(ideBlock, "nNF") || "0", 10);
  const serie = parseInt(extractTag(ideBlock, "serie") || "1", 10);
  const natOp = extractTag(ideBlock, "natOp") || "Remessa para Industrializacao";
  const dhEmiRaw = extractTag(ideBlock, "dhEmi") || extractTag(ideBlock, "dEmi");
  const dataEmissao = dhEmiRaw ? new Date(dhEmiRaw) : new Date();

  // 3. Emitente (<emit>) - Fábrica parceira (ex: Ritme)
  const emitBlock = extractTag(xmlContent, "emit");
  const emitCnpj = extractTag(emitBlock, "CNPJ") || extractTag(emitBlock, "CPF");
  const emitRazao = extractTag(emitBlock, "xNome");
  const emitFantasia = extractTag(emitBlock, "xFant");
  const emitIE = extractTag(emitBlock, "IE");

  const enderEmit = extractTag(emitBlock, "enderEmit");
  const emitLogradouro = extractTag(enderEmit, "xLgr");
  const emitNumero = extractTag(enderEmit, "nro");
  const emitBairro = extractTag(enderEmit, "xBairro");
  const emitMunicipio = extractTag(enderEmit, "xMun");
  const emitUf = extractTag(enderEmit, "UF");
  const emitCep = extractTag(enderEmit, "CEP");

  // 4. Destinatário (<dest>) - Oficina / Facção
  const destBlock = extractTag(xmlContent, "dest");
  const destCnpj = extractTag(destBlock, "CNPJ") || extractTag(destBlock, "CPF");
  const destRazao = extractTag(destBlock, "xNome");

  // 5. Totalizador (<vNF>)
  const totalBlock = extractTag(xmlContent, "total");
  const icmsTot = extractTag(totalBlock, "ICMSTot");
  const valorTotalRaw = extractTag(icmsTot, "vNF") || extractTag(totalBlock, "vNF") || "0";
  const valorTotal = parseFloat(valorTotalRaw) || 0;

  // 6. Itens (<det nItem="...">)
  const itens: ParsedNfeItem[] = [];
  const detRegex = /<(?:\w+:)?det[^>]*nItem=["'](\d+)["'][^>]*>([\s\S]*?)<\/(?:\w+:)?det>/gi;
  let detMatch;

  while ((detMatch = detRegex.exec(xmlContent)) !== null) {
    const numItem = parseInt(detMatch[1], 10);
    const detContent = detMatch[2];
    const prodContent = extractTag(detContent, "prod");

    const codigo = extractTag(prodContent, "cProd");
    const descricao = extractTag(prodContent, "xProd");
    const ncm = extractTag(prodContent, "NCM");
    const cfop = extractTag(prodContent, "CFOP");
    const unidade = extractTag(prodContent, "uCom") || "UN";
    const quantidade = parseFloat(extractTag(prodContent, "qCom") || "1");
    const valorUnitario = parseFloat(extractTag(prodContent, "vUnCom") || "0");
    const valorItemTotal = parseFloat(extractTag(prodContent, "vProd") || "0");

    itens.push({
      numeroItem: numItem,
      codigo,
      descricao,
      ncm,
      cfop,
      unidade,
      quantidade,
      valorUnitario,
      valorTotal: valorItemTotal,
    });
  }

  // 7. Transporte & Volumes (<transp>)
  const transpBlock = extractTag(xmlContent, "transp");
  let transporte: ParsedTransporte | undefined = undefined;
  if (transpBlock) {
    const modFrete = extractTag(transpBlock, "modFrete") || "0";
    const transpData = extractTag(transpBlock, "transporta");
    const transpVeic = extractTag(transpBlock, "veicTransp");
    const volData = extractTag(transpBlock, "vol");

    const transpNome = extractTag(transpData, "xNome");
    const transpCnpj = extractTag(transpData, "CNPJ") || extractTag(transpData, "CPF");
    const transpIe = extractTag(transpData, "IE");
    const transpEnd = extractTag(transpData, "xEnder");
    const transpMun = extractTag(transpData, "xMun");
    const transpUf = extractTag(transpData, "UF");
    const transpPlaca = extractTag(transpVeic, "placa");
    const transpPlacaUf = extractTag(transpVeic, "UF");

    const qVol = extractTag(volData, "qVol");
    const esp = extractTag(volData, "esp");
    const marca = extractTag(volData, "marca");
    const nVol = extractTag(volData, "nVol");
    const pesoB = extractTag(volData, "pesoB");
    const pesoL = extractTag(volData, "pesoL");

    transporte = {
      modalidadeFrete: modFrete,
      transportador: transpNome || transpCnpj ? {
        razaoSocial: transpNome,
        cnpj: transpCnpj,
        inscricaoEstadual: transpIe,
        endereco: transpEnd,
        municipio: transpMun,
        uf: transpUf,
        placa: transpPlaca,
        ufVeiculo: transpPlacaUf,
      } : undefined,
      volumes: qVol || pesoB || pesoL ? {
        quantidade: qVol ? parseInt(qVol, 10) : undefined,
        especie: esp || "VOLUMES",
        marca,
        numero: nVol,
        pesoBruto: pesoB ? parseFloat(pesoB) : undefined,
        pesoLiquido: pesoL ? parseFloat(pesoL) : undefined,
      } : undefined,
    };
  }

  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    valorTotal,
    naturezaOperacao: natOp,
    emitente: {
      cnpj: emitCnpj,
      razaoSocial: emitRazao,
      nomeFantasia: emitFantasia,
      inscricaoEstadual: emitIE,
      logradouro: emitLogradouro,
      numero: emitNumero,
      bairro: emitBairro,
      municipio: emitMunicipio,
      uf: emitUf,
      cep: emitCep,
    },
    destinatario: {
      cnpj: destCnpj,
      razaoSocial: destRazao,
    },
    itens,
    transporte,
  };
}
