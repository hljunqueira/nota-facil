import { redirect } from "next/navigation";

export default function FechamentoPage() {
  redirect("/configuracoes?tab=fechamento");
}
