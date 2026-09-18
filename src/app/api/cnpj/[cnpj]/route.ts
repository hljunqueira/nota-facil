import { NextRequest, NextResponse } from "next/server";
import { lookupCnpj } from "@/lib/services/cnpj";

export async function GET(
  request: NextRequest,
  { params }: { params: { cnpj: string } }
) {
  const cnpj = params.cnpj;
  if (!cnpj) {
    return NextResponse.json(
      { error: "CNPJ obrigatório" },
      { status: 400 }
    );
  }

  const result = await lookupCnpj(cnpj);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Erro ao consultar CNPJ" },
      { status: 422 }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
