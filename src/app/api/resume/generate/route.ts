import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import type { StructuredResume } from "../parse/route";
import { generatePDFByTemplate } from "@/lib/resume-templates";

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

    const { resumeData, templateType } = await request.json() as {
      resumeData: StructuredResume;
      templateType?: string;
    };

    if (!resumeData) {
      return NextResponse.json(
        { error: "Dados do currículo não fornecidos" },
        { status: 400 }
      );
    }

    // Usar o template escolhido ou o padrão do usuário
    const selectedTemplate = templateType || user.resume.templateType || 'classic';

    // Gerar PDF usando o template selecionado
    const doc = generatePDFByTemplate(resumeData, selectedTemplate);

    // Gerar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Upload para Vercel Blob Storage
    const uniqueFileName = `resumes/${user.githubId}-structured-${Date.now()}.pdf`;
    const blob = await put(uniqueFileName, pdfBuffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    // Atualizar no banco de dados (incluindo dados estruturados editados)
    await prisma.resume.update({
      where: { id: user.resume.id },
      data: {
        fileUrl: blob.url,
        fileName: uniqueFileName,
        templateType: selectedTemplate,
        structuredData: JSON.parse(JSON.stringify(resumeData)), // Salvar dados editados como JSON
      },
    });

    console.log("Currículo gerado e dados estruturados atualizados");

    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar PDF" },
      { status: 500 }
    );
  }
}
