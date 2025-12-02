import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
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

    // Buscar usuário
    // @ts-ignore
    const githubId = String(session.user.id || session.userId);
    const user = await prisma.user.findUnique({
      where: { githubId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.type === "application/pdf" ? "pdf" : "docx";
    const uniqueFileName = `resumes/${user.githubId}-${Date.now()}.${fileExtension}`;

    // Upload para Vercel Blob Storage
    const blob = await put(uniqueFileName, file, {
      access: 'public',
      contentType: file.type,
    });

    const fileUrl = blob.url;

    // Salvar ou atualizar no banco de dados
    const resume = await prisma.resume.upsert({
      where: { userId: user.id },
      update: {
        originalFileName: file.name,
        fileType: fileExtension,
        fileUrl: fileUrl,
        enhancedFileUrl: null, // Reset enhanced version
        isEnhanced: false,
        structuredData: Prisma.JsonNull, // Limpar cache - forçar reprocessamento
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        originalFileName: file.name,
        fileType: fileExtension,
        fileUrl: fileUrl,
      },
    });

    console.log("Novo PDF enviado - cache de dados estruturados limpo");

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        fileName: resume.originalFileName,
        fileUrl: resume.fileUrl,
        fileType: resume.fileType,
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

export async function GET(request: NextRequest) {
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

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    if (!user.resume) {
      return NextResponse.json({ resume: null });
    }

    return NextResponse.json({
      resume: {
        id: user.resume.id,
        fileName: user.resume.originalFileName,
        fileUrl: user.resume.fileUrl,
        fileType: user.resume.fileType,
        enhancedFileUrl: user.resume.enhancedFileUrl,
        isEnhanced: user.resume.isEnhanced,
        createdAt: user.resume.createdAt,
        updatedAt: user.resume.updatedAt,
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // @ts-ignore
    const githubId = String(session.user.id || session.userId);
    const user = await prisma.user.findUnique({
      where: { githubId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    await prisma.resume.delete({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar currículo:", error);
    return NextResponse.json(
      { error: "Erro ao deletar currículo" },
      { status: 500 }
    );
  }
}
