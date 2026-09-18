import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMonthlyZipBuffer } from "@/lib/services/monthlyCloseService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultMes = now.getMonth() === 0 ? 12 : now.getMonth();
    const defaultAno = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const mes = Number(searchParams.get("mes")) || defaultMes;
    const ano = Number(searchParams.get("ano")) || defaultAno;

    if (mes < 1 || mes > 12) {
      return NextResponse.json({ error: "Mês inválido." }, { status: 400 });
    }

    const { zipBuffer, fileName } = await generateMonthlyZipBuffer({
      tenantId: session.user.tenantId,
      mes,
      ano,
    });

    return new Response(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[api/contador/download] Erro ao gerar ZIP:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao gerar arquivo ZIP." },
      { status: 500 }
    );
  }
}
