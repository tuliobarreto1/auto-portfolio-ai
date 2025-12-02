import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // @ts-ignore
    const githubId = String(session.user.id || session.userId);
    const user = await prisma.user.findUnique({
      where: { githubId },
      include: { resume: true },
    });

    if (!user || !user.resume) {
      return NextResponse.json(
        { error: "Currículo não encontrado" },
        { status: 404 }
      );
    }

    // Limpar o cache de dados estruturados
    await prisma.resume.update({
      where: { id: user.resume.id },
      data: {
        structuredData: null,
      },
    });

    console.log("Cache de dados estruturados limpo");

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
