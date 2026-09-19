---
name: notafacil-operations
description: >-
  Procedimentos operacionais, fiscais e de infraestrutura da plataforma Nota Fácil.
  Use esta skill sempre que for trabalhar com regras fiscais de facção/oficina têxtil
  (CFOP 5901, 5902, 5124), integração com Focus NFe, extração de DANFE/Espelho,
  fechamento contábil mensal ou rotinas de deploy na VPS.
---

# Nota Fácil — Guia Operacional e Fiscal

Este documento é a referência canônica para o ecossistema Nota Fácil, voltado exclusivamente para a rotina prática e contábil de oficinas de costura (facções) que prestam serviços de industrialização por encomenda para confecções e marcas de roupas.

---

## 1. Regras Fiscais de Industrialização por Encomenda (Simples Nacional)

A facção opera sob triangulação fiscal da LC 123/2006. É proibido tributar o valor total das peças.

### A. Remessa de Matéria-Prima (CFOP 5901)
* **Origem**: Emitida pela fábrica/marca contratante e recebida pela facção.
* **Tributação**: **R$ 0,00 de imposto** para a facção.
* **Natureza**: Entrada física para industrialização por conta e ordem.

### B. Retorno de Insumos / Matéria-Prima (CFOP 5902)
* **Emissão**: Pela facção ao devolver as peças costuradas para a fábrica.
* **Tributação**: **Não tributável**. ICMS suspenso ou diferido conforme legislação estadual.
* **Obrigatoriedade SEFAZ**: Deve conter obrigatoriamente a chave de acesso da NF-e de remessa vinculada no campo `notas_referenciadas: [{ chave_nfe }]` para evitar rejeição SEFAZ 317.
* **Texto Legal**: `"ICMS diferido ou suspenso conforme legislacao estadual de industrializacao por encomenda. Documento emitido por ME ou EPP optante pelo Simples Nacional."`

### C. Cobrança do Serviço de Costura / Mão de Obra (CFOP 5124)
* **Emissão**: Pela facção com base no **Espelho de Produção** enviado pela fábrica.
* **Tributação**: **Única receita bruta tributável da facção** (tributada no Simples Nacional).
* **Obrigatoriedade SEFAZ**: Também referencia a NF-e de remessa original (CFOP 5901).
* **Texto Legal**: `"Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI."`

---

## 2. Padrões de Interface (Mobile-First Touch-Friendly)

As oficinas de costura operam majoritariamente via smartphones no chão de fábrica:
1. **Zero Scroll Horizontal**: O layout nunca deve exceder `100vw`. Containers flex usam `min-w-0` e `overflow-x-hidden`.
2. **Área Tátil Mínima**: Qualquer botão interativo no mobile deve ter no mínimo `min-h-[44px]` (padrão ergonômico Apple/Android).
3. **Visão Dual de Dados**:
   * **Mobile (`block md:hidden`)**: Cards verticais nativos com dados em destaque e botões grandes (WhatsApp, DANFE, Retorno, Cobrança).
   * **Desktop (`hidden md:block`)**: Tabelas fluidas com chaves SEFAZ condensadas.
4. **Navegação Oficial**:
   * `/dashboard`: **Visão Geral**
   * `/notas`: **Notas Fiscais**
   * `/parceiros`: **Fábricas**
   * `/assinatura`: **Assinatura**
   * `/configuracoes`: **Configurações**

---

## 3. Fechamento Mensal do Contador (ZIP Segregado)

O fechamento contábil mensal gerado por [`src/lib/services/monthlyCloseService.ts`](file:///src/lib/services/monthlyCloseService.ts) empacota todos os XMLs do mês selecionado e um relatório CSV com:
* Colunas explícitas: `Modalidade`, `CFOP_Principal` e `BaseCalculoSimples`.
* Totais destacados no rodapé:
  * `Base de Calculo Tributavel (CFOP 5124)`
  * `Total Nao Tributavel (CFOP 5902)`
* Protege a oficina contra tributação indevida da devolução de tecidos.

---

## 4. Infraestrutura e Deploy na VPS

* **Servidor**: VPS Ubuntu `184.107.141.97` (diretório `/opt/notafacil`).
* **SSH Key**: `$env:USERPROFILE\.ssh\id_rsa`.
* **Script Automatizado**: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1`.
* **Containers Docker**:
  * `notafacil-app`: Next.js 14 em modo standalone.
  * `notafacil-worker`: BullMQ worker para processamentos assíncronos.
  * `notafacil-db`: PostgreSQL 16 com Prisma ORM.
  * `notafacil-redis`: Redis 7 para filas e rate limiting.
  * `notafacil-evolution`: Evolution API v2 para WhatsApp.
* **Domínios em Produção**:
  * Aplicação: `https://appnotafacil.online`
  * Painel Admin: `https://admin.appnotafacil.online`
  * API WhatsApp: `https://wa.appnotafacil.online`
