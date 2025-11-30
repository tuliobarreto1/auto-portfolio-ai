import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    
    // Criar diretório de uploads se não existir
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "resumes");
    await mkdir(uploadsDir, { recursive: true });

    // Salvar arquivo
    const filePath = path.join(uploadsDir, uniqueFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/resumes/${uniqueFileName}`;

    // Salvar ou atualizar no banco de dados
    const resume = await prisma.resume.upsert({
      where: { userId: user.id },
      update: {
        originalFileName: file.name,
        fileType: fileExtension,
        fileUrl: fileUrl,
        enhancedFileUrl: null, // Reset enhanced version
        isEnhanced: false,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        originalFileName: file.name,
        fileType: fileExtension,
        fileUrl: fileUrl,
      },
    });

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
