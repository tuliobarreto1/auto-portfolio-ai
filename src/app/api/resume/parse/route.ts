import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import path from "path";

// Interface para o currículo estruturado
export interface StructuredResume {
  personalInfo: {
    nome: string;
    email: string;
    telefone: string;
    endereco: string;
    linkedin: string;
    github: string;
  };
  resumoProfissional: string;
  experiencias: Array<{
    cargo: string;
    empresa: string;
    periodo: string;
    descricao: string;
    responsabilidades: string[];
  }>;
  educacao: Array<{
    curso: string;
    instituicao: string;
    periodo: string;
    descricao: string;
  }>;
  habilidades: {
    tecnicas: string[];
    idiomas: string[];
    outras: string[];
  };
  certificacoes: string[];
  projetos: Array<{
    nome: string;
    descricao: string;
    tecnologias: string[];
  }>;
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

    if (!user || !user.resume) {
      return NextResponse.json(
        { error: "Currículo não encontrado" },
        { status: 404 }
      );
    }

    // Extrair texto do PDF usando pdf2json
    const pdfPath = path.join(process.cwd(), "public", user.resume.fileUrl);

    const extractedText = await new Promise<string>((resolve, reject) => {
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        // Extrair texto de todas as páginas
        const text = pdfData.Pages.map((page: any) =>
          page.Texts.map((textItem: any) =>
            textItem.R.map((r: any) => decodeURIComponent(r.T)).join(" ")
          ).join(" ")
        ).join("\n");
        resolve(text);
      });

      pdfParser.on("pdfParser_dataError", (error: any) => {
        reject(error);
      });

      pdfParser.loadPDF(pdfPath);
    });

    // Usar DeepSeek para estruturar o conteúdo
    const apiKey = process.env.OPENAI_API_KEY;
    const provider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'deepseek';

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key da IA não configurada" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: provider === 'deepseek' ? 'https://api.deepseek.com' : undefined,
    });

    const prompt = `Analise o seguinte currículo e estruture as informações em formato JSON.
Extraia APENAS as informações que existem no texto, não invente nada.

CURRÍCULO:
${extractedText}

Retorne um JSON com a seguinte estrutura:
{
  "personalInfo": {
    "nome": "Nome completo",
    "email": "email@example.com",
    "telefone": "telefone se disponível",
    "endereco": "endereço se disponível",
    "linkedin": "URL do LinkedIn se disponível",
    "github": "URL do GitHub se disponível"
  },
  "resumoProfissional": "Resumo profissional ou objetivo",
  "experiencias": [
    {
      "cargo": "Cargo",
      "empresa": "Nome da empresa",
      "periodo": "Jan 2020 - Dez 2023",
      "descricao": "Descrição breve",
      "responsabilidades": ["resp1", "resp2"]
    }
  ],
  "educacao": [
    {
      "curso": "Nome do curso",
      "instituicao": "Nome da instituição",
      "periodo": "2015 - 2019",
      "descricao": "Descrição se disponível"
    }
  ],
  "habilidades": {
    "tecnicas": ["skill1", "skill2"],
    "idiomas": ["Português", "Inglês"],
    "outras": ["outras habilidades"]
  },
  "certificacoes": ["cert1", "cert2"],
  "projetos": [
    {
      "nome": "Nome do projeto",
      "descricao": "Descrição",
      "tecnologias": ["tech1", "tech2"]
    }
  ]
}

IMPORTANTE:
- Se alguma informação não estiver disponível, use string vazia "" ou array vazio []
- Seja fiel ao texto original, não adicione informações que não existem
- Mantenha a formatação e organização do currículo original`;

    const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em análise e estruturação de currículos. Seja preciso e fiel ao conteúdo original.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const structuredResume = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      success: true,
      originalText: extractedText,
      structured: structuredResume,
    });
  } catch (error: any) {
    console.error("Erro ao processar currículo:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar currículo" },
      { status: 500 }
    );
  }
}
