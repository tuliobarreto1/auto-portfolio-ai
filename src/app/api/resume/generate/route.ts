import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { uploadFile, presignedUrl } from "@/lib/storage";
import { getResume, updateResumeGenerated } from "@/lib/db";
import type { StructuredResume } from "../parse/route";
import { generatePDFByTemplate } from "@/lib/resume-templates";

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
    const selectedTemplate = templateType || resume.templateType || 'classic';

    // Gerar PDF usando o template selecionado
    const doc = generatePDFByTemplate(resumeData, selectedTemplate);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Upload para o storage S3 do InfraForge
    const key = `resumes/${session.userId}-structured-${Date.now()}.pdf`;
    await uploadFile(key, pdfBuffer, "application/pdf");

    // Atualizar no banco (incluindo os dados estruturados editados)
    await updateResumeGenerated(client, session.userId, {
      fileUrl: key,
      fileName: key,
      templateType: selectedTemplate,
      structuredData: resumeData,
    });

    return NextResponse.json({
      success: true,
      fileUrl: await presignedUrl(key),
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar PDF" },
      { status: 500 }
    );
  }
}
