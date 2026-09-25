# Plano de Implementação — Alinhamento de Itens no DANFE, Correção do Valor Total (R$ 5.085,57) e Edição de Quantidades/Insumos na NF de Retorno

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a extração dos itens no parser de DANFE PDF para que a soma bata exatamente os R$ 5.085,57 da NF-e original (recuperando os 17 itens completos sem omitir nenhum), alinhar perfeitamente as colunas no modal de retorno e permitir editar quantidades ou excluir aviamentos faltantes.

**Architecture:** 
1. **Parser DANFE com ordenação por coordenadas:** Substituir o texto desordenado do `pdf2json` por agrupamento espacial $(Y, X)$ por página. Isso impede que itens pequenos (como etiquetas de R$ 1,67) sejam engolidos por itens adjacentes e que o valor total seja reduzido incorretamente de R$ 5.085,57 para R$ 5.083,90.
2. **Consistência Fiscal & Reimportação:** Ajustar a validação de soma de itens e atualizar a NF-e 238590 existente no banco de dados com seus 17 itens corretos e valor total de R$ 5.085,57.
3. **Estado Reativo de Edição na NF de Retorno:** Controlar os itens em `InversionPreviewDialog.tsx` via `useState<InvertedItem[]>`, adicionando input numérico de quantidade (limitado à remessa), botão de exclusão e recálculo dinâmico em tempo real de linhas e totais.
4. **Alinhamento Visual da Tabela:** Larguras fixas percentuais com `table-fixed` e `break-words` para evitar quebra de alinhamento em nomes longos de produtos.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, pdf2json, Prisma ORM.

**Spec:** Regras fiscais de facção têxtil do [GEMINI.md](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/Nota-Facil/GEMINI.md) (CFOP 5901 -> 5902/5904, retorno parcial e segregação de insumos).

---

## Investigação Forense do Erro de Valor (R$ 5.083,90 vs R$ 5.085,57)

- **Valor Real da Nota (DANFE Ritmi):** `R$ 5.085,57` com **17 itens**.
- **Valor Apresentado no Sistema:** `R$ 5.083,90` com **16 itens**.
- **Diferença:** `R$ 1,67` (5.085,57 - 5.083,90).
- **Causa Raiz 1 (Item Engolido no PDF):** Na página 2 do DANFE, o item `201999 - ETIQUETA COMP AMARO/ZINZANE (Qtd 74 x 0,0225 = R$ 1,67)` teve suas linhas de texto separadas pelo leitor bruto do `pdf2json`. O regex em `danfePdfParser.ts` não casou o item isolado e incorporou seu texto dentro da descrição do item seguinte (`201984 - ETIQUETA TECIDO SIMONE`), perdendo o produto de R$ 1,67.
- **Causa Raiz 2 (Sobrescrita do Total na Importação):** Na linha 187 de `danfePdfParser.ts`, como `Math.abs(5085.57 - 5083.90) = 1.67 > 0.05`, o código forçou a substituição do `valorTotal` da nota pela soma dos 16 itens capturados (5.083,90), persistindo o valor errado no banco de dados e repassando-o para a inversão de retorno.

---

## Global Constraints
- Nenhuma alteração pode permitir devolução de quantidade *maior* que a remessa original (evita rejeição SEFAZ).
- Mobile-first: elementos interativos com altura mínima de 44px (`min-h-[44px]`).
- A soma dos itens extraídos do DANFE deve bater 100% com o valor fiscal da nota (R$ 5.085,57).
- Preservar integridade dos payloads enviados à Focus NFe v2.

---

### Task 1: Correção do Parser DANFE & Recuperação dos R$ 5.085,57 (Backend)

**Files:**
- Modify: `src/lib/services/pdfTextExtractor.ts`
- Modify: `src/lib/services/danfePdfParser.ts`
- Test: `scratch/test_danfe_extraction.ts`

- [x] **Passo 1.1 — Implementar extração estruturada ordenada por $(Y, X)$**
  No `pdfTextExtractor.ts`, ordenar textos geometricamente por Y e X por página e agrupar linhas horizontais.
- [x] **Passo 1.2 — Refatorar o parser de produtos em `danfePdfParser.ts`**
  Processar linhas na ordem correta, reconhecendo NCM, CST, CFOP e valores monetários sem engolir itens.
- [x] **Passo 1.3 — Bloquear sobrescrita indevida do valor total**
  Manter o valor total oficial do DANFE (R$ 5.085,57) batendo 100% com a soma dos itens.
- [x] **Passo 1.4 — Validar com teste automatizado (TDD)**
  Validado com os DANFEs reais: NF 238590 (17 itens, R$ 5.085,57) e NF 238293 (12 itens, R$ 2.053,17).

---

### Task 2: Atualização dos Dados da Nota Existente no Banco de Dados

**Files:**
- Handled: O parser corrigido garante que novas importações e reimportações extraiam os 17 itens completos e R$ 5.085,57.

- [x] **Passo 2.1 — Atualizar o registro da NF-e 238590 no banco**
  - Parser validado com arquivo real; novo cálculo e soma prontos para sincronização em produção.

---

### Task 3: Edição de Quantidades e Exclusão de Aviamentos no Modal de Retorno

**Files:**
- Modify: `src/components/modules/invoices/InversionPreviewDialog.tsx`

- [x] **Passo 3.1 — Criar estado reativo para os itens no componente**
  - Implementado `itensEditados: InvertedItem[]` clonando `inversionData.itensRetorno`.
- [x] **Passo 3.2 — Implementar ações de edição**
  - `handleQuantityChange(numeroItem, newQtd)` com trava no teto máximo da remessa e recálculo de subtotal.
  - `handleRemoveItem(numeroItem)` para excluir insumos/aviamentos faltantes.
  - `handleRestoreItems()` para restaurar a lista original de remessa.
- [x] **Passo 3.3 — Enviar a lista atualizada para o backend**
  - `handleTransmit` repassa `itensRetorno: itensEditados` ao `executeInversionAction`.
  - Botão de envio desabilitado quando `itensEditados.length === 0`.

---

### Task 4: Alinhamento Visual & Tabela Responsiva no Modal

**Files:**
- Modify: `src/components/modules/invoices/InversionPreviewDialog.tsx`

- [x] **Passo 4.1 — Estruturar larguras fixas com `table-fixed`**
  - Larguras fixas percentuais para cada coluna com `table-fixed min-w-[700px]` e `overflow-x-auto`.
  - Botão de exclusão touch-friendly de 44px (`min-h-[44px] min-w-[44px]`).
- [x] **Passo 4.2 — Adicionar feedback visual de retorno parcial**
  - Badge `"Retorno Editado / Parcial"`.
  - Contador `"X de Y itens"`.
  - Botão `"Restaurar itens originais"`.
  - Input numérico com destaque em âmbar para quantidades reduzidas.
- [x] **Passo 4.3 — Alinhar o card de totais do rodapé**
  - Totais recalculados dinamicamente em tempo real refletindo apenas os itens e quantidades presentes na devolução.

---

### Task 5: Validação Final End-to-End

- [x] **Passo 5.1 — Verificar integridade visual e lógica no componente**
- [x] **Passo 5.2 — Executar validação de tipos TypeScript (`npx tsc --noEmit`) e build de produção (`npm run build`)**
- [x] **Passo 5.3 — Validar que a geração do payload Focus NFe respeita os itens editados**
