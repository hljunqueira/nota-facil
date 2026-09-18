/**
 * Módulo Central de Monitoramento e Rastreamento de Exceções Fiscais (Sentry)
 * Captura stack traces detalhados e payloads brutos de integração sem expor dados sensíveis na UI.
 */

import * as Sentry from "@sentry/nextjs";

export interface FiscalErrorContext {
  tenantId?: string;
  invoiceId?: string;
  focusNfeRef?: string;
  statusSefaz?: string;
  mensagemSefaz?: string;
  payload?: any;
  actorId?: string;
}

/**
 * Captura uma exceção fiscal e encaminha para o Sentry com metadados estruturados
 */
export function captureFiscalException(
  error: any,
  context: FiscalErrorContext = {}
) {
  const errorObj = error instanceof Error ? error : new Error(String(error?.mensagem || error));

  try {
    Sentry.withScope((scope) => {
      if (context.tenantId) {
        scope.setTag("tenant_id", context.tenantId);
      }
      if (context.statusSefaz) {
        scope.setTag("status_sefaz", context.statusSefaz);
      }
      if (context.focusNfeRef) {
        scope.setTag("focus_nfe_ref", context.focusNfeRef);
      }

      scope.setExtras({
        ...context,
        timestamp: new Date().toISOString(),
      });

      Sentry.captureException(errorObj);
    });
  } catch (sentryErr) {
    console.warn("[Monitoring] Sentry não inicializado ou DSN ausente:", sentryErr);
  }

  // Log estruturado no console do servidor para coletores de logs do Docker
  console.error(
    `[FISCAL_EXCEPTION] [Tenant: ${context.tenantId || "N/A"}] [SEFAZ: ${
      context.statusSefaz || "N/A"
    }] ${errorObj.message}`,
    {
      invoiceId: context.invoiceId,
      focusNfeRef: context.focusNfeRef,
      mensagemSefaz: context.mensagemSefaz,
    }
  );
}
