import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import type { StructuredResume } from "../parse/route";
import { jsPDF } from "jspdf";

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

    const { resumeData } = await request.json() as { resumeData: StructuredResume };

    if (!resumeData) {
      return NextResponse.json(
        { error: "Dados do currículo não fornecidos" },
        { status: 400 }
      );
    }

    // Criar documento PDF com jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);
    let yPos = 20;

    // Helper para adicionar texto com quebra de linha
    const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = '#000000') => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }

      // Converter cor hex para RGB
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      doc.setTextColor(r, g, b);

      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += fontSize * 0.4;
      });
      yPos += 3;
    };

    const addSpace = (space: number) => {
      yPos += space;
    };

    // Cabeçalho
    addText(resumeData.personalInfo.nome || 'Nome não informado', 20, true, '#1a1a1a');
    addSpace(2);

    // Informações de contato
    if (resumeData.personalInfo.email) {
      addText(resumeData.personalInfo.email, 10, false, '#555555');
    }
    if (resumeData.personalInfo.telefone) {
      addText(resumeData.personalInfo.telefone, 10, false, '#555555');
    }
    if (resumeData.personalInfo.linkedin) {
      addText(resumeData.personalInfo.linkedin, 10, false, '#555555');
    }
    if (resumeData.personalInfo.github) {
      addText(resumeData.personalInfo.github, 10, false, '#555555');
    }
    addSpace(5);

    // Resumo Profissional
    if (resumeData.resumoProfissional) {
      addText('RESUMO PROFISSIONAL', 14, true, '#2563eb');
      addSpace(2);
      addText(resumeData.resumoProfissional, 10, false, '#333333');
      addSpace(5);
    }

    // Experiência Profissional
    if (resumeData.experiencias && resumeData.experiencias.length > 0) {
      addText('EXPERIÊNCIA PROFISSIONAL', 14, true, '#2563eb');
      addSpace(2);

      resumeData.experiencias.forEach(exp => {
        addText(exp.cargo || '', 12, true, '#1a1a1a');
        addText(`${exp.empresa || ''} | ${exp.periodo || ''}`, 10, false, '#555555');

        if (exp.descricao) {
          addText(exp.descricao, 10, false, '#333333');
        }

        if (exp.responsabilidades && exp.responsabilidades.length > 0) {
          exp.responsabilidades.forEach(resp => {
            addText(`• ${resp}`, 10, false, '#333333');
          });
        }
        addSpace(5);
      });
    }

    // Educação
    if (resumeData.educacao && resumeData.educacao.length > 0) {
      addText('EDUCAÇÃO', 14, true, '#2563eb');
      addSpace(2);

      resumeData.educacao.forEach(edu => {
        addText(edu.curso || '', 12, true, '#1a1a1a');
        addText(`${edu.instituicao || ''} | ${edu.periodo || ''}`, 10, false, '#555555');

        if (edu.descricao) {
          addText(edu.descricao, 10, false, '#333333');
        }
        addSpace(5);
      });
    }

    // Habilidades
    if (resumeData.habilidades && (resumeData.habilidades.tecnicas?.length > 0 || resumeData.habilidades.idiomas?.length > 0)) {
      addText('HABILIDADES', 14, true, '#2563eb');
      addSpace(2);

      if (resumeData.habilidades.tecnicas && resumeData.habilidades.tecnicas.length > 0) {
        addText('Técnicas:', 11, true, '#1a1a1a');
        addText(resumeData.habilidades.tecnicas.join(' • '), 10, false, '#333333');
        addSpace(3);
      }

      if (resumeData.habilidades.idiomas && resumeData.habilidades.idiomas.length > 0) {
        addText('Idiomas:', 11, true, '#1a1a1a');
        addText(resumeData.habilidades.idiomas.join(' • '), 10, false, '#333333');
        addSpace(3);
      }
      addSpace(2);
    }

    // Projetos
    if (resumeData.projetos && resumeData.projetos.length > 0) {
      addText('PROJETOS', 14, true, '#2563eb');
      addSpace(2);

      resumeData.projetos.forEach(proj => {
        addText(proj.nome || '', 12, true, '#1a1a1a');

        if (proj.descricao) {
          addText(proj.descricao, 10, false, '#333333');
        }

        if (proj.tecnologias && proj.tecnologias.length > 0) {
          addText(`Tecnologias: ${proj.tecnologias.join(', ')}`, 10, false, '#555555');
        }
        addSpace(5);
      });
    }

    // Certificações
    if (resumeData.certificacoes && resumeData.certificacoes.length > 0) {
      addText('CERTIFICAÇÕES', 14, true, '#2563eb');
      addSpace(2);

      resumeData.certificacoes.forEach(cert => {
        addText(`• ${cert}`, 10, false, '#333333');
      });
    }

    // Gerar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Garantir que o diretório existe
    const outputDir = path.join(process.cwd(), "public", "uploads", "resumes");
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Salvar PDF
    const uniqueFileName = `structured-${uuidv4()}.pdf`;
    const outputPath = path.join(outputDir, uniqueFileName);
    await writeFile(outputPath, pdfBuffer);

    // Atualizar no banco de dados
    await prisma.resume.update({
      where: { id: user.resume.id },
      data: {
        fileUrl: `/uploads/resumes/${uniqueFileName}`,
      },
    });

    return NextResponse.json({
      success: true,
      fileUrl: `/uploads/resumes/${uniqueFileName}`,
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar PDF" },
      { status: 500 }
    );
  }
}
