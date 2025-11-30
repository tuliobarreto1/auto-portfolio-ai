import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        // @ts-ignore
        const githubId = session.user.id || session.userId;

        // Busca o usuário
        const user = await prisma.user.findUnique({
            where: { githubId },
            include: {
                repositories: {
                    where: { selected: true },
                },
                portfolioItems: true,
            },
        });

        if (!user) {
            return NextResponse.json({
                selectedRepos: [],
                portfolioItems: {},
            });
        }

        // Formata os repositórios selecionados
        const selectedRepos = user.repositories.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.fullName,
            description: repo.description,
            html_url: repo.htmlUrl,
            language: repo.language,
            stargazers_count: repo.stargazersCount,
            updated_at: repo.updatedAt.toISOString(),
            private: repo.private,
        }));

        // Formata os portfolio items
        const portfolioItems: Record<number, any> = {};
        for (const item of user.portfolioItems) {
            portfolioItems[item.repoId] = {
                repoId: item.repoId,
                objective: item.objective,
                features: item.features,
                technicalSummary: item.technicalSummary,
                demoUrl: item.demoUrl,
                recordingUrl: item.recordingUrl,
            };
        }

        return NextResponse.json({
            selectedRepos,
            portfolioItems,
        });
    } catch (error) {
        console.error("Erro ao carregar portfólio:", error);
        return NextResponse.json({ error: "Falha ao carregar dados" }, { status: 500 });
    }
}
