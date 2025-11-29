import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getRepoContent } from "@/lib/github";
import { auth } from "@/auth";

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { repoName, owner } = await req.json();

    // Usa a API key configurada no servidor
    const apiKey = process.env.OPENAI_API_KEY;
    const provider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'deepseek';

    if (!apiKey) {
        return NextResponse.json({ error: "API Key não configurada no servidor" }, { status: 500 });
    }

    try {
        // @ts-ignore
        const token = session.accessToken as string;
        const content = await getRepoContent(owner, repoName, token);

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: provider === 'deepseek' ? 'https://api.deepseek.com' : undefined,
        });

        // Monta informações disponíveis
        const availableInfo = [];

        if (content.description) {
            availableInfo.push(`Descrição do repositório: ${content.description}`);
        }

        if (content.readme) {
            availableInfo.push(`README:\n${content.readme.substring(0, 3000)}`);
        }

        if (content.packageJson) {
            availableInfo.push(`Package.json:\n${content.packageJson}`);
        }

        if (content.sourceFiles) {
            availableInfo.push(`Arquivos de código principais:\n${content.sourceFiles}`);
        }

        const prompt = `
      Analise o conteúdo do repositório a seguir e gere três seções distintas em português-br para um portfólio profissional.

      IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem blocos de código, apenas o JSON puro):
      {
        "objective": "texto aqui",
        "features": "texto aqui",
        "technicalSummary": "texto aqui"
      }

      Regras para cada seção:

      1. "objective" (2-3 frases): Descreva de forma clara e objetiva qual é o propósito da aplicação, o problema que ela resolve e para quem é destinada. Analise o código fornecido para entender o objetivo.

      2. "features" (3-5 bullet points): Liste as principais funcionalidades da aplicação de forma concisa. Use formato de lista com bullets (•). Baseie-se no código e documentação fornecidos.

      3. "technicalSummary" (2-3 frases): Descreva a stack tecnológica utilizada, arquitetura, padrões e aspectos técnicos relevantes. Analise os imports, dependências e estrutura do código.

      Informações do repositório:
      ${availableInfo.join('\n\n')}
    `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Você é um assistente especializado em criar descrições técnicas para portfólios. Retorne APENAS JSON válido, sem markdown ou formatação adicional." },
                { role: "user", content: prompt }
            ],
            model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo',
            response_format: { type: "json_object" },
        });

        const aiResponse = completion.choices[0].message.content;
        let parsedResponse;

        try {
            parsedResponse = JSON.parse(aiResponse || "{}");
        } catch (e) {
            console.error("Failed to parse AI response:", aiResponse);
            throw new Error("Resposta da IA em formato inválido");
        }

        return NextResponse.json({
            objective: parsedResponse.objective || "",
            features: parsedResponse.features || "",
            technicalSummary: parsedResponse.technicalSummary || ""
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Falha ao analisar repositório" }, { status: 500 });
    }
}
