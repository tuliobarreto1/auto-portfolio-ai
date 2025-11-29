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

        const prompt = `
      Analise o conteúdo do repositório a seguir e gere um resumo curto, atraente e técnico para portfólio (máximo 100 palavras).
      Foque no que o projeto faz, na stack tecnológica e em seus recursos principais. Sempre em português-br.

      README:
      ${content.readme.substring(0, 3000)}

      Package.json:
      ${content.packageJson}
    `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Você é um assistente especializado em criar resumos técnicos para portfólios." },
                { role: "user", content: prompt }
            ],
            model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo',
        });

        return NextResponse.json({ summary: completion.choices[0].message.content });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Falha ao analisar repositório" }, { status: 500 });
    }
}
