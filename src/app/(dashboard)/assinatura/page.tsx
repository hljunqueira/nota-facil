import React from "react";
import { getSubscriptionInfoAction } from "@/actions/subscription";
import { SubscriptionClientView } from "@/components/modules/subscription/SubscriptionClientView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Minha Assinatura — Nota Fácil",
  description: "Gerenciamento de plano, faturas e condições comerciais da oficina.",
};

export default async function AssinaturaPage() {
  const tenant = await getSubscriptionInfoAction();

  return <SubscriptionClientView tenant={tenant} />;
}
