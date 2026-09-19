# Nota Fácil — Diretrizes de Engenharia e Memória do Projeto

Este arquivo define as regras de desenvolvimento, padrões de arquitetura e conhecimento de domínio que regem o ecossistema do **Nota Fácil**.

---

## 1. Conhecimento de Domínio Fiscal (Facções Têxteis)

A plataforma atende exclusivamente oficinas de costura (facções) que operam em regime de **Industrialização por Encomenda (Simples Nacional - LC 123/2006)**.

1. **Remessa da Fábrica (CFOP 5901)**:
   - Entrada física de tecidos cortados para montagem.
   - **R$ 0,00 de receita e imposto**. Não compõe a base tributável.
2. **Retorno de Insumos (CFOP 5902)**:
   - Devolução contábil da matéria-prima utilizada.
   - **Não tributável** (ICMS suspenso ou diferido).
   - **Obrigatório**: campo `notas_referenciadas: [{ chave_nfe }]` com a chave de acesso da NF-e 5901 correspondente para evitar rejeição SEFAZ 317.
   - Texto legal obrigatório: *"ICMS diferido ou suspenso conforme legislacao estadual de industrializacao por encomenda. Documento emitido por ME ou EPP optante pelo Simples Nacional."*
3. **Cobrança de Mão de Obra de Costura (CFOP 5124)**:
   - Faturamento do serviço de costura efetuado a partir do **Espelho de Produção** da fábrica.
   - **Única base de cálculo tributável** da oficina no Simples Nacional.
   - **Obrigatório**: referenciar a NF-e 5901 de remessa original.
   - Texto legal obrigatório: *"Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI."*
4. **Fechamento Contábil Mensal**:
   - O arquivo ZIP gerado para a contabilidade deve conter a segregação explícita:
     - `Base de Calculo Tributavel (CFOP 5124)`
     - `Total Nao Tributavel (CFOP 5902)`
   - Impede que o contador tribute a devolução física de insumos da fábrica.
5. **Segregação de Peças de Vestuário vs. Aviamentos**:
   - Em uma remessa (CFOP 5901), apenas itens com NCMs de confecção (capítulos 61, 62 e 63) ou unidades UN/PC que não sejam aviamentos representam **peças produzidas/costuradas**.
   - Aviamentos (linhas, fios, zíperes, elásticos, botões, etiquetas de composição, RFID) são insumos complementares e **nunca** devem ser somados à contagem de peças de mão de obra para cobrança (CFOP 5124) ou previsão de Receita na Linha.
   - Previsão de Receita na Linha considera apenas remessas com faturamento em aberto (filtrando cobranças autorizadas, ignorando canceladas) e precifica com base no histórico da fábrica parceira ou valor acordado em espelho (R$ 40,00/peça padrão).

---

## 2. Padrões de Interface (UI / UX)

1. **Zero Scroll Horizontal**:
   - Toda página deve ser blindada contra overflow horizontal (`overflow-x: hidden`, `max-width: 100vw`).
   - Containers flex devem conter `min-w-0` para evitar expansão por herança de largura mínima de elementos filhos.
2. **Mobile First Touch-Friendly (Mínimo 44px)**:
   - Oficinas utilizam celulares no chão de fábrica.
   - Todo botão de ação ou elemento tátil interativo deve ter altura mínima de 44px (`min-h-[44px]`).
   - Barra de navegação inferior mobile ampliada para `h-16` (64px) com botões touch largos (20% de largura cada).
3. **Visão Dual de Listagens**:
   - **Mobile (`block md:hidden`)**: Cards verticais nativos com dados legíveis e botões grandes diretos (WhatsApp, DANFE PDF, Retorno 5902, Faturar 5124, Romaneio).
   - **Desktop (`hidden md:block`)**: Tabelas fluidas com chaves SEFAZ condensadas nos 8 últimos dígitos com botão de cópia de 1 clique.
4. **Menus de Navegação Oficiais**:
   - `/dashboard`: **Visão Geral**
   - `/notas`: **Notas Fiscais**
   - `/parceiros`: **Fábricas**
   - `/assinatura`: **Assinatura**
   - `/configuracoes`: **Configurações**

---

## 3. Arquitetura e Engenharia

1. **Framework**: Next.js 14 com App Router, React 18 e Tailwind CSS.
2. **Multi-Tenancy Scoping**:
   - Todo acesso ao banco deve ser estritamente isolado pelo `tenantId`.
   - Utilizar a extensão Prisma configurada em [`src/lib/prisma.ts`](file:///src/lib/prisma.ts) que intercepta consultas e mutações para garantir isolamento entre oficinas.
3. **Integrações Externas**:
   - **Focus NFe**: Emissão de NF-e, cancelamento, cartas de correção e MDe.
   - **Evolution API v2**: Envio de DANFE PDF e avisos fiscais via WhatsApp institucional.
   - **Resend / SMTP**: Envio de DANFE PDF e XML por e-mail com identificação da oficina no remetente e no corpo.
   - **Asaas**: Cobrança e assinaturas da plataforma.
4. **Processamento Assíncrono**:
   - BullMQ com Redis (`src/workers/`) para fechamento contábil e rotinas de sincronização pesadas.

---

## 4. Infraestrutura e Deploy

* **Servidor de Produção**: VPS Ubuntu `184.107.141.97` no diretório `/opt/notafacil`.
* **Deploy Automatizado**: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`.
* **Ambientes**:
  * Aplicação: `https://appnotafacil.online`
  * Painel Administrativo: `https://admin.appnotafacil.online`
  * API WhatsApp: `https://wa.appnotafacil.online`
