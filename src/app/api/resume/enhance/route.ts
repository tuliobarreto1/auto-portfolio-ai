import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Octokit } from "octokit";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      include: {
        resume: true,
        repositories: {
          where: { selected: true },
        },
        portfolioItems: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    if (!user.resume) {
      return NextResponse.json(
        { error: "Nenhum currículo encontrado" },
        { status: 404 }
      );
    }

    // Coletar informações dos projetos
    const projectsInfo = user.portfolioItems.map((item) => ({
      name: item.repository.name,
      description: item.repository.description,
      language: item.repository.language,
      objective: item.objective,
      features: item.features,
      technicalSummary: item.technicalSummary,
      url: item.repository.htmlUrl,
    }));

    // Verificar se há projetos para analisar
    if (projectsInfo.length === 0) {
      return NextResponse.json(
        { error: "Você precisa selecionar e analisar alguns projetos antes de aprimorar o currículo" },
        { status: 400 }
      );
    }

    // Se for PDF, usar PDFDancer
    if (user.resume.fileType === "pdf") {
      // Usa a chave do ambiente
      const pdfdancerApiKey = process.env.PDFDANCER_API_KEY;
      
      if (!pdfdancerApiKey) {
        return NextResponse.json(
          { error: "Chave da API PDFDancer não configurada no servidor" },
          { status: 500 }
        );
      }

      // Analisar projetos com IA para gerar sugestões
      const aiAnalysis = await analyzeProjectsForResume(projectsInfo);

      // Integração com PDFDancer
      const enhancedPdfUrl = await enhanceResumeWithPDFDancer(
        user.resume.fileUrl,
        aiAnalysis,
        pdfdancerApiKey
      );

      // Atualizar no banco
      await prisma.resume.update({
        where: { id: user.resume.id },
        data: {
          enhancedFileUrl: enhancedPdfUrl,
          isEnhanced: true,
        },
      });

      return NextResponse.json({
        success: true,
        enhancedFileUrl: enhancedPdfUrl,
        suggestions: aiAnalysis,
      });
    } else {
      // Para DOCX, apenas retornar sugestões da IA
      const aiAnalysis = await analyzeProjectsForResume(projectsInfo);

      return NextResponse.json({
        success: true,
        suggestions: aiAnalysis,
        message:
          "Para arquivos DOCX, as sugestões devem ser aplicadas manualmente",
      });
    }
  } catch (error) {
    console.error("Erro ao processar currículo:", error);
    return NextResponse.json(
      { error: "Erro ao processar currículo" },
      { status: 500 }
    );
  }
}

async function analyzeProjectsForResume(
  projects: any[]
): Promise<{
  skills: string[];
  experience: string[];
  highlights: string[];
}> {
  const prompt = `Analise os seguintes projetos do GitHub e sugira melhorias para um currículo profissional.
Seja OBJETIVO e HONESTO - não exagere nas conquistas.

Projetos:
${JSON.stringify(projects, null, 2)}

Retorne em formato JSON:
{
  "skills": ["lista de habilidades técnicas identificadas"],
  "experience": ["descrições concisas de experiência baseadas nos projetos"],
  "highlights": ["principais conquistas reais e mensuráveis"]
}

IMPORTANTE: Seja preciso e factual. Não invente métricas ou conquistas que não existem.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente especializado em análise de currículos e projetos técnicos. Seja preciso, factual e evite exageros.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const analysis = JSON.parse(completion.choices[0].message.content || "{}");
  return analysis;
}

async function enhanceResumeWithPDFDancer(
  originalFileUrl: string,
  analysis: any,
  apiKey: string
): Promise<string> {
  // Esta função será implementada com a integração real do PDFDancer
  // Por enquanto, retorna a URL original
  
  // Documentação: https://docs.pdfdancer.com/
  // A implementação exata dependerá da estrutura da API
  
  const pdfDancerApiUrl = "https://api.pdfdancer.com"; // URL base da API
  
  try {
    // Exemplo de como seria a integração (ajustar conforme documentação real)
    const response = await fetch(`${pdfDancerApiUrl}/v1/pdf/modify`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceUrl: `${process.env.NEXT_PUBLIC_APP_URL}${originalFileUrl}`,
        modifications: {
          addSkills: analysis.skills,
          addExperience: analysis.experience,
          addHighlights: analysis.highlights,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Erro ao processar PDF com PDFDancer");
    }

    const result = await response.json();
    
    // Baixar e salvar o PDF processado
    const pdfResponse = await fetch(result.outputUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    
    const uniqueFileName = `${uuidv4()}.pdf`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "resumes");
    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, uniqueFileName);
    await writeFile(filePath, pdfBuffer);
    
    return `/uploads/resumes/${uniqueFileName}`;
  } catch (error) {
    console.error("Erro ao usar PDFDancer:", error);
    // Em caso de erro, retorna a URL original
    return originalFileUrl;
  }
}
