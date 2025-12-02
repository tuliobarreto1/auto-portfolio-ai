import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // @ts-ignore
    const githubId = String(session.user.id || session.userId);

    // Buscar projetos selecionados do usuário
    const portfolioItems = await prisma.portfolioItem.findMany({
      where: {
        user: {
          githubId: githubId,
        },
      },
      include: {
        repository: true,
      },
    });

    if (portfolioItems.length === 0) {
      return NextResponse.json({
        error: "Nenhum projeto selecionado encontrado. Selecione projetos no dashboard primeiro.",
      }, { status: 400 });
    }

    // Extrair informações dos projetos
    const projectsInfo = portfolioItems.map(item => ({
      name: item.repository.name,
      description: item.repository.description || "",
      language: item.repository.language || "",
      technicalSummary: item.technicalSummary || "",
      features: item.features || "",
    }));

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

    const prompt = `Você é um especialista em análise de currículos e tecnologia. Analise os seguintes projetos do GitHub e sugira as principais habilidades técnicas do desenvolvedor, com níveis de proficiência realistas.

PROJETOS:
${projectsInfo.map((p, i) => `
Projeto ${i + 1}: ${p.name}
Linguagem Principal: ${p.language}
Descrição: ${p.description}
Resumo Técnico: ${p.technicalSummary}
Funcionalidades: ${p.features}
`).join('\n')}

Com base nesses projetos, retorne um JSON com as habilidades técnicas identificadas e seus níveis de proficiência. Use os seguintes níveis:
- "Básico" - conhecimento inicial, usa ocasionalmente
- "Intermediário" - usa frequentemente, conhece bem
- "Avançado" - domina, usa em projetos complexos
- "Expert" - domínio profundo, referência na tecnologia

Seja realista na avaliação dos níveis. Se uma tecnologia aparece em vários projetos complexos, pode ser Avançado ou Expert. Se aparece apenas em um projeto simples, deve ser Básico ou Intermediário.

Retorne APENAS um JSON no seguinte formato:
{
  "skills": [
    {
      "name": "Nome da tecnologia/linguagem/framework",
      "level": "Básico|Intermediário|Avançado|Expert"
    }
  ]
}

IMPORTANTE:
- Liste entre 8 a 15 habilidades mais relevantes
- Inclua linguagens, frameworks, bibliotecas e ferramentas
- Seja específico (ex: "React", "Node.js", "PostgreSQL", não apenas "JavaScript")
- Ordene do mais avançado para o básico`;

    const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "Você é um especialista em análise de habilidades técnicas de desenvolvedores. Analise projetos e sugira habilidades com níveis realistas e precisos.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return NextResponse.json({
      success: true,
      skills: result.skills || [],
      projectsAnalyzed: portfolioItems.length,
    });
  } catch (error: any) {
    console.error("Erro ao sugerir habilidades:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao sugerir habilidades" },
      { status: 500 }
    );
  }
}
