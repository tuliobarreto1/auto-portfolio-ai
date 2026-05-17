import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { uploadFile, presignedUrl } from "@/lib/storage";
import { getResume, upsertResumeFile, deleteResume } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo foi enviado" },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo inválido. Use PDF ou DOCX" },
        { status: 400 }
      );
    }

    // Validar tamanho (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 10MB" },
        { status: 400 }
      );
    }

    const client = authedClient(session.jwt);

    const fileExtension = file.type === "application/pdf" ? "pdf" : "docx";
    const key = `resumes/${session.userId}-${Date.now()}.${fileExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(key, buffer, file.type);

    await upsertResumeFile(client, session.userId, {
      originalFileName: file.name,
      fileType: fileExtension,
      fileUrl: key,
    });

    const resume = await getResume(client, session.userId);

    return NextResponse.json({
      success: true,
      resume: {
        id: resume?.id,
        fileName: resume?.originalFileName,
        fileUrl: resume ? await presignedUrl(resume.fileUrl) : null,
        fileType: resume?.fileType,
      },
    });
  } catch (error) {
    console.error("Erro ao fazer upload do currículo:", error);
    return NextResponse.json(
      { error: "Erro ao processar o arquivo" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resume = await getResume(authedClient(session.jwt), session.userId);

    if (!resume) {
      return NextResponse.json({ resume: null });
    }

    return NextResponse.json({
      resume: {
        id: resume.id,
        fileName: resume.originalFileName,
        fileUrl: await presignedUrl(resume.fileUrl),
        fileType: resume.fileType,
        enhancedFileUrl: resume.enhancedFileUrl
          ? await presignedUrl(resume.enhancedFileUrl)
          : null,
        isEnhanced: resume.isEnhanced,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar currículo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar currículo" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
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

    await deleteResume(client, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar currículo:", error);
    return NextResponse.json(
      { error: "Erro ao deletar currículo" },
      { status: 500 }
    );
  }
}
