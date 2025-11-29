import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getRepoContent } from "@/lib/github";
import { auth } from "@/auth";

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoName, owner, apiKey, provider = 'openai' } = await req.json();

    if (!apiKey) {
        return NextResponse.json({ error: "API Key is required" }, { status: 400 });
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
      Analyze the following repository content and generate a short, attractive, and technical portfolio summary (max 100 words).
      Focus on what the project does, the tech stack, and its key features. Always in portuguese-br.
      
      README:
      ${content.readme.substring(0, 3000)}
      
      Package.json:
      ${content.packageJson}
    `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful portfolio assistant." },
                { role: "user", content: prompt }
            ],
            model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo',
        });

        return NextResponse.json({ summary: completion.choices[0].message.content });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to analyze repository" }, { status: 500 });
    }
}
