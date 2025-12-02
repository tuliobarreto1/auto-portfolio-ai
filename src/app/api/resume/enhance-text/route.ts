import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { text, fieldType } = await request.json();

    if (!text || !fieldType) {
      return NextResponse.json(
        { error: "Texto e tipo de campo são obrigatórios" },
        { status: 400 }
      );
    }

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

    // Prompts específicos para cada tipo de campo
    const prompts: Record<string, string> = {
      resumoProfissional: `Você é um especialista em currículos. Melhore o seguinte resumo profissional tornando-o mais impactante, conciso e profissional. Mantenha o tom objetivo e destaque as principais competências e experiências. Máximo 3-4 frases.

Resumo atual:
${text}

Retorne APENAS o resumo melhorado, sem explicações adicionais.`,

      cargo: `Melhore o seguinte título de cargo tornando-o mais profissional e específico. Retorne APENAS o cargo melhorado, sem explicações.

Cargo atual: ${text}`,

      descricao: `Melhore a seguinte descrição de experiência profissional. Torne-a mais clara, objetiva e impactante. Destaque realizações e responsabilidades. Máximo 2-3 frases.

Descrição atual:
${text}

Retorne APENAS a descrição melhorada, sem explicações.`,

      responsabilidade: `Melhore a seguinte responsabilidade/realização profissional. Torne-a mais específica, mensurável e impactante. Use verbos de ação fortes.

Responsabilidade atual: ${text}

Retorne APENAS a responsabilidade melhorada (1 frase), sem explicações.`,

      curso: `Melhore o seguinte nome de curso/formação acadêmica. Torne-o mais claro e formal.

Curso atual: ${text}

Retorne APENAS o nome do curso melhorado, sem explicações.`,

      descricaoEducacao: `Melhore a seguinte descrição de formação acadêmica. Destaque conquistas, honras ou especializações relevantes.

Descrição atual: ${text}

Retorne APENAS a descrição melhorada (1-2 frases), sem explicações.`,

      habilidadeTecnica: `Melhore a seguinte habilidade técnica. Seja específico sobre o nível de proficiência ou tecnologias relacionadas se relevante.

Habilidade atual: ${text}

Retorne APENAS a habilidade melhorada, sem explicações.`,

      nomeProjeto: `Melhore o seguinte nome de projeto. Torne-o mais descritivo e profissional.

Nome atual: ${text}

Retorne APENAS o nome melhorado, sem explicações.`,

      descricaoProjeto: `Melhore a seguinte descrição de projeto. Destaque o problema resolvido, tecnologias usadas e impacto. Máximo 2-3 frases.

Descrição atual:
${text}

Retorne APENAS a descrição melhorada, sem explicações.`,

      certificacao: `Melhore o seguinte nome de certificação. Inclua a instituição emissora se estiver faltando.

Certificação atual: ${text}

Retorne APENAS a certificação melhorada, sem explicações.`,
    };

    const prompt = prompts[fieldType] || `Melhore o seguinte texto de currículo, tornando-o mais profissional e impactante:

${text}

Retorne APENAS o texto melhorado, sem explicações.`;

    const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "Você é um especialista em otimização de currículos. Sua função é melhorar textos de currículos tornando-os mais profissionais, impactantes e concisos. Sempre responda APENAS com o texto melhorado, sem explicações adicionais.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const enhancedText = completion.choices[0].message.content?.trim() || text;

    return NextResponse.json({
      success: true,
      enhancedText: enhancedText,
    });
  } catch (error: any) {
    console.error("Erro ao aprimorar texto:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao aprimorar texto" },
      { status: 500 }
    );
  }
}
