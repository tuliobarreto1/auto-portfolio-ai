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
        const rawGithubId = session.user.id || session.userId;
        // Converte para string (GitHub ID vem como número)
        const githubId = String(rawGithubId);

        console.log("Load: Loading data for githubId:", githubId);

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
            console.log("Load: No user found for githubId:", githubId);
            return NextResponse.json({
                selectedRepos: [],
                portfolioItems: {},
            });
        }

        console.log("Load: User found, selected repos:", user.repositories.length);

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

        console.log("Load: Returning data successfully");
        return NextResponse.json({
            selectedRepos,
            portfolioItems,
        });
    } catch (error: any) {
        console.error("Load: Error loading portfolio:", error);
        console.error("Load: Error message:", error.message);
        return NextResponse.json({
            error: "Falha ao carregar dados",
            details: error.message
        }, { status: 500 });
    }
}
