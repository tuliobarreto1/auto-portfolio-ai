import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Octokit } from "octokit";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { PDFDancer, Color } from "pdfdancer-client-typescript";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Configuração da IA (OpenAI ou DeepSeek)
    const apiKey = process.env.OPENAI_API_KEY;
    const provider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'deepseek';

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key da IA não configurada no servidor" },
        { status: 500 }
      );
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
      const aiAnalysis = await analyzeProjectsForResume(projectsInfo, apiKey, provider);

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
      const aiAnalysis = await analyzeProjectsForResume(projectsInfo, apiKey, provider);

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
  projects: any[],
  apiKey: string,
  provider: 'openai' | 'deepseek'
): Promise<{
  skills: string[];
  experience: string[];
  highlights: string[];
}> {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: provider === 'deepseek' ? 'https://api.deepseek.com' : undefined,
  });

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

  const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';

  const completion = await openai.chat.completions.create({
    model: model,
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
  try {
    // Ler o arquivo PDF original
    const pdfPath = path.join(process.cwd(), "public", originalFileUrl);
    const pdfBuffer = await readFile(pdfPath);
    
    // Inicializar PDFDancer com o token da API
    const pdfDancerToken = process.env.PDFDANCER_API_KEY;
    
    // Abrir o PDF com PDFDancer (sintaxe correta: passa pdfData diretamente, não como objeto)
    const pdf = await PDFDancer.open(pdfBuffer, pdfDancerToken);
    
    // Adicionar um parágrafo com as skills principais no topo da primeira página
    if (analysis.skills && analysis.skills.length > 0) {
      const skillsText = `Habilidades Destacadas: ${analysis.skills.slice(0, 5).join(', ')}`;
      
      await pdf.newParagraph()
        .text(skillsText)
        .font("Helvetica-Bold", 10)
        .color(new Color(0, 102, 204)) // Azul (RGB com alpha padrão)
        .at(1, 72, 720) // pageNumber, x, y - Topo da página
        .add();
    }
    
    // Adicionar experiência relevante baseada nos projetos
    if (analysis.experience && analysis.experience.length > 0) {
      const experienceText = `Experiência Relevante (GitHub): ${analysis.experience[0]}`;
      
      await pdf.newParagraph()
        .text(experienceText)
        .font("Helvetica", 9)
        .at(1, 72, 695) // pageNumber, x, y
        .add();
    }
    
    // Adicionar highlights como bullet points
    if (analysis.highlights && analysis.highlights.length > 0) {
      let yPosition = 670;
      for (let i = 0; i < Math.min(3, analysis.highlights.length); i++) {
        await pdf.newParagraph()
          .text(`• ${analysis.highlights[i]}`)
          .font("Helvetica", 9)
          .at(1, 72, yPosition - (i * 20)) // pageNumber, x, y
          .add();
      }
    }
    
    // Salvar o PDF modificado
    const uniqueFileName = `enhanced-${uuidv4()}.pdf`;
    const outputPath = path.join(process.cwd(), "public", "uploads", "resumes", uniqueFileName);
    await pdf.save(outputPath);
    
    return `/uploads/resumes/${uniqueFileName}`;
  } catch (error) {
    console.error("Erro ao usar PDFDancer:", error);
    // Em caso de erro, retorna a URL original
    return originalFileUrl;
  }
}
