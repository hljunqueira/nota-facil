---
version: 1.0.0
name: Nota-Facil-Fiscal-Design-System
description: "An ultra-fast, high-clarity tax invoice emission and financial management interface. Designed around fiscal emerald green (#10B981), dark slate trust text (#0F172A), and clean error-free form inputs. Prioritizes zero-distraction data entry and invoice status certainty."

colors:
  primary: "#10B981"
  primary-dark: "#047857"
  primary-hover: "#059669"
  on-primary: "#FFFFFF"
  canvas: "#F8FAFC"
  surface-1: "#FFFFFF"
  surface-2: "#F1F5F9"
  ink: "#0F172A"
  ink-muted: "#475569"
  ink-subtle: "#94A3B8"
  hairline: "#E2E8F0"
  status-authorized: "#10B981"
  status-cancelled: "#EF4444"
  status-processing: "#3B82F6"
  status-contingency: "#F59E0B"

typography:
  font-sans: "'Inter', -apple-system, sans-serif"
  font-mono: "'Roboto Mono', monospace"
  scale:
    amount: { fontSize: "28px", fontWeight: "700", font: "mono" }
    title: { fontSize: "20px", fontWeight: "600" }
    label: { fontSize: "13px", fontWeight: "600" }
    input: { fontSize: "15px", fontWeight: "400" }

elevation:
  card: "0 1px 3px rgba(15, 23, 42, 0.05)"
  invoice-preview: "0 10px 25px rgba(15, 23, 42, 0.1)"

radius:
  input: "6px"
  card: "8px"
  tag: "4px"

components:
  invoice-form:
    grid: "Campos alinhados com máscaras automáticas (CNPJ, NCM, Alíquotas), validação inline em tempo real."
  emission-action:
    cta: "Botão principal verde esmeralda (#10B981) grande com atalho de teclado indicado (Ctrl + Enter)."
---
