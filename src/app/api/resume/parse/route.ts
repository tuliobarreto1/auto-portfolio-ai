import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { getResume, updateResumeStructuredData } from "@/lib/db";
import OpenAI from "openai";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";

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
    tecnicas: Array<string | { name: string; level?: string }>;
    idiomas: string[];
    outras: string[];
  };
  showSkillLevels?: boolean; // Se deve exibir níveis no currículo final
  certificacoes: string[];
  projetos: Array<{
    nome: string;
    descricao: string;
    tecnologias: string[];
  }>;
}

export async function GET(request: NextRequest) {
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

    // Se já tiver dados estruturados salvos, retornar do cache
    if (resume.structuredData) {
      console.log("Usando dados estruturados do cache");
      return NextResponse.json({
        success: true,
        originalText: "Dados do cache (PDF já processado anteriormente)",
        structured: resume.structuredData,
        fromCache: true,
      });
    }

    console.log("Processando PDF pela primeira vez...");

    // Determinar se é URL do storage ou caminho local
    let pdfPath: string;
    let isTemporaryFile = false;

    if (resume.fileUrl.startsWith("http")) {
      // Baixar do storage para arquivo temporário
      console.log("Baixando PDF do storage...");
      const response = await fetch(resume.fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      pdfPath = path.join(tmpdir(), `resume-${session.userId}-${Date.now()}.pdf`);
      await writeFile(pdfPath, buffer);
      isTemporaryFile = true;
    } else {
      // Usar caminho local
      pdfPath = path.join(process.cwd(), "public", resume.fileUrl);
    }

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

    // Limpar arquivo temporário se foi baixado
    if (isTemporaryFile) {
      try {
        await unlink(pdfPath);
      } catch (err) {
        console.error("Erro ao deletar arquivo temporário:", err);
      }
    }

    // Usar IA para estruturar o conteúdo
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
      "descricao": "Descrição completa com todas as atividades",
      "responsabilidades": []
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
- Para cada experiência profissional, coloque TODO o texto das atividades/responsabilidades no campo "descricao"
- COPIE O CONTEÚDO EXATAMENTE como está. NÃO converta em tópicos ou bullets. NÃO reformate. NÃO resuma
- Para preservar múltiplos parágrafos, separe-os com " | " (espaço-pipe-espaço) dentro da string. Exemplo: "Primeiro parágrafo | Segundo parágrafo | Terceiro parágrafo"
- Deixe o campo "responsabilidades" sempre como array vazio []
- Ordene as experiências da mais recente para a mais antiga (pela data de início)
- CRÍTICO: O JSON deve ser válido. Não use quebras de linha literais dentro das strings. Use o separador " | " para indicar parágrafos diferentes
- Se houver aspas duplas no texto original, escape-as como \\"
- Garanta que o JSON retornado seja 100% válido e parseável`;

    const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em análise e estruturação de currículos. Seja preciso e fiel ao conteúdo original. SEMPRE retorne JSON válido com caracteres especiais corretamente escapados.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0].message.content || "{}";

    let structuredResume;
    try {
      structuredResume = JSON.parse(rawContent);
    } catch (parseError: any) {
      console.error("Erro ao parsear JSON da IA:", parseError);
      console.error("Conteúdo problemático (primeiros 1000 chars):", rawContent.substring(0, 1000));

      throw new Error(
        `A IA retornou um JSON inválido. Por favor, tente fazer upload do PDF novamente. ` +
        `Erro: ${parseError.message}`
      );
    }

    // Salvar dados estruturados no banco para uso futuro
    await updateResumeStructuredData(client, session.userId, structuredResume);

    console.log("Dados estruturados salvos no banco");

    return NextResponse.json({
      success: true,
      originalText: extractedText,
      structured: structuredResume,
      fromCache: false,
    });
  } catch (error: any) {
    console.error("Erro ao processar currículo:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar currículo" },
      { status: 500 }
    );
  }
}
