# Guia de Integração Asaas — Nota Fácil

Este guia orienta a configuração completa da integração entre a plataforma **Nota Fácil** e a sua conta de produção no **Asaas** para gestão automatizada de assinaturas recorrentes com repasse da taxa do gateway (R$ 289,90 + 1,99% = R$ 295,67/mês), controle de vencimento e liberação automática via Webhook.

---

## 1. Dados e Credenciais de Produção

A chave de API de Produção gerada no Asaas foi configurada no sistema:

- **Endpoint da API**: `https://api.asaas.com/v3`
- **Chave de API (Access Token)**: Configurada no arquivo `.env` via `ASAAS_API_KEY`
- **Token Secreto do Webhook**: Configurado no arquivo `.env` via `ASAAS_WEBHOOK_SECRET`
- **Mensalidade no Asaas**: R$ 289,90 + 1,99% = **R$ 295,67 / mês** (garantindo o valor líquido de R$ 289,90 após a taxa do Asaas).
- **Pix Automático**: Desmarcado/Desativado (utiliza-se o Pix Cobrança Padrão com QR Code dinâmico e Copia e Cola).

---

## 2. Configuração do Webhook no Painel do Asaas

Para que o Nota Fácil receba as confirmações de pagamento via Pix, Boleto ou Cartão em tempo real e ative as contas automaticamente, siga o passo a passo abaixo no painel do Asaas:

1. Acesse sua conta do Asaas: [https://www.asaas.com](https://www.asaas.com)
2. No menu lateral esquerdo, clique em **Configurações** (ícone de engrenagem) e depois em **Integrações**.
3. Na aba **Webhooks**, localize a seção **Cobranças** e clique em **Criar Webhook** (ou **Adicionar**).
4. Preencha os campos exatamente assim:
   - **Nome / Identificação**: `Nota Fácil - Produção`
   - **URL de Envio**: `https://appnotafacil.online/api/webhooks/asaas`
   - **E-mail para Alertas**: Seu e-mail de administrador (para avisos de falha).
   - **Versão da API**: `v3`
   - **Status**: Marque como **Ativo**.
   - **Token de Autenticação**: Digite o token secreto:
     ```text
     notafacil_asaas_webhook_secret_2026
     ```
     *(O Asaas enviará este token no cabeçalho `asaas-access-token` para comprovar que a notificação é legítima).*

5. Na lista de **Eventos a Notificar**, marque os seguintes eventos recomendados:
   - [x] **Pagamento confirmado** (`PAYMENT_CONFIRMED`)
   - [x] **Pagamento recebido** (`PAYMENT_RECEIVED`)
   - [x] **Pagamento vencido** (`PAYMENT_OVERDUE`)
   - [x] **Pagamento estornado** (`PAYMENT_REFUNDED`)
   - [x] **Assinatura criada** (`SUBSCRIPTION_CREATED`)
   - [x] **Assinatura atualizada** (`SUBSCRIPTION_UPDATED`)
   - [x] **Assinatura removida** (`SUBSCRIPTION_DELETED`)
6. Clique em **Salvar**.
7. O Asaas permite clicar em **Testar Webhook** — ao testar, ele enviará um disparo de teste para a URL e receberá HTTP 200 de sucesso.

---

## 3. Como Funciona a Gestão no Painel Admin

Ao acessar [`https://admin.appnotafacil.online/admin/tenants`](https://admin.appnotafacil.online/admin/tenants):

1. **Abrir a Oficina**: Clique no nome da oficina ou no botão **Gerenciar**.
2. **Modal Central em 4 Grids**:
   - **Grid 1 (Visão Geral)**: Status da conta, ambiente fiscal e total de notas.
   - **Grid 2 (Gestão Financeira & Vencimento)**:
     - **Dia de Vencimento**: Você escolhe o melhor dia para o cliente (ex: dia 05, 10, 15, 20 ou 25).
     - **Sincronizar no Asaas**: Ao clicar neste botão, o Nota Fácil:
       1. Cria ou localiza o cliente no Asaas com o CNPJ, Razão Social e WhatsApp da oficina.
       2. Cria ou atualiza a assinatura recorrente de **R$ 289,90 / mês** com o dia de vencimento escolhido.
       3. Salva o `asaasCustomerId` e o `asaasSubscriptionId` na oficina.
   - **Grid 3 (Dados Cadastrais)**: Edite Razão Social, Nome Fantasia, Telefone e E-mail da oficina.
   - **Grid 4 (Plano & Tokens)**: Alterne entre **Plano Parceria (24 meses)** e **Plano Flex**, e configure os tokens da Focus NFe.

---

## 4. O Que o Assinante Visualiza na Área do Cliente

Na página [`https://appnotafacil.online/assinatura`](https://appnotafacil.online/assinatura):

1. O assinante visualiza o plano definido pelo administrador (**Plano Parceria** ou **Plano Flex**).
2. Visualiza a sua mensalidade de **R$ 289,90 / mês**.
3. Visualiza o dia de vencimento configurado: **"Vencimento: Todo dia {dia}"**.
4. Conta com o botão direto para pagar sua fatura mensal do Asaas (gerando QR Code Pix Copia e Cola ou código de barras do Boleto bancário).
5. Assim que o cliente realiza o pagamento, o webhook do Asaas recebe o evento em segundos e mantém ou desbloqueia a conta para emissão fiscal automática.

---

## 5. Variáveis de Ambiente no Servidor

No arquivo `.env` da aplicação (localmente e na VPS em `/opt/notafacil/.env`):

```env
# ASAAS PRODUÇÃO
ASAAS_API_URL="https://api.asaas.com/v3"
ASAAS_API_KEY="seu_access_token_asaas_aqui"
ASAAS_WEBHOOK_SECRET="seu_token_secreto_webhook_aqui"
```
