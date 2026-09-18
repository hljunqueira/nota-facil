import { redirect } from "next/navigation";

export default function AdminConfiguracoesRedirectPage() {
  redirect("/admin/logs");
}
