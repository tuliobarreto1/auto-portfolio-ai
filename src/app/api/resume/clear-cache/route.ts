import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { getResume, clearResumeCache } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const client = authedClient(session.jwt);
    const resume = await getResume(client, session.userId);

    if (!resume) {
      return NextResponse.json(
        { error: "Currículo não encontrado" },
        { status: 404 }
      );
    }

    await clearResumeCache(client, session.userId);

    return NextResponse.json({
      success: true,
      message: "Cache limpo com sucesso. Faça upload do PDF novamente para reprocessar.",
    });
  } catch (error: any) {
    console.error("Erro ao limpar cache:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao limpar cache" },
      { status: 500 }
    );
  }
}
