import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { repositories, portfolioItems, selectedRepoIds } = await req.json();

        // @ts-ignore
        const githubId = session.user.id || session.userId;
        const username = session.user.name || "";
        const email = session.user.email || "";

        // Cria ou atualiza o usuário
        const user = await prisma.user.upsert({
            where: { githubId },
            update: {
                username,
                email,
            },
            create: {
                githubId,
                username,
                email,
            },
        });

        // Sincroniza repositórios
        for (const repo of repositories) {
            const isSelected = selectedRepoIds.includes(repo.id);

            await prisma.repository.upsert({
                where: {
                    userId_id: {
                        userId: user.id,
                        id: repo.id,
                    },
                },
                update: {
                    name: repo.name,
                    fullName: repo.full_name,
                    description: repo.description,
                    htmlUrl: repo.html_url,
                    language: repo.language,
                    stargazersCount: repo.stargazers_count,
                    updatedAt: new Date(repo.updated_at),
                    private: repo.private,
                    selected: isSelected,
                },
                create: {
                    id: repo.id,
                    userId: user.id,
                    name: repo.name,
                    fullName: repo.full_name,
                    description: repo.description,
                    htmlUrl: repo.html_url,
                    language: repo.language,
                    stargazersCount: repo.stargazers_count,
                    updatedAt: new Date(repo.updated_at),
                    private: repo.private,
                    selected: isSelected,
                },
            });
        }

        // Sincroniza portfolio items
        for (const [repoId, item] of Object.entries(portfolioItems)) {
            const itemData = item as any;

            if (!itemData.objective && !itemData.features && !itemData.technicalSummary && !itemData.demoUrl && !itemData.recordingUrl) {
                // Se não tem dados, remove do banco se existir
                await prisma.portfolioItem.deleteMany({
                    where: {
                        userId: user.id,
                        repoId: parseInt(repoId),
                    },
                });
                continue;
            }

            await prisma.portfolioItem.upsert({
                where: {
                    userId_repoId: {
                        userId: user.id,
                        repoId: parseInt(repoId),
                    },
                },
                update: {
                    objective: itemData.objective,
                    features: itemData.features,
                    technicalSummary: itemData.technicalSummary,
                    demoUrl: itemData.demoUrl,
                    recordingUrl: itemData.recordingUrl,
                },
                create: {
                    userId: user.id,
                    repoId: parseInt(repoId),
                    objective: itemData.objective,
                    features: itemData.features,
                    technicalSummary: itemData.technicalSummary,
                    demoUrl: itemData.demoUrl,
                    recordingUrl: itemData.recordingUrl,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao sincronizar portfólio:", error);
        return NextResponse.json({ error: "Falha ao sincronizar dados" }, { status: 500 });
    }
}
