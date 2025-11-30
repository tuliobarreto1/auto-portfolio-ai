import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        console.error("Sync: No session found");
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { repositories, portfolioItems, selectedRepoIds } = await req.json();

        // @ts-ignore
        const rawGithubId = session.user.id || session.userId;
        // Converte para string (GitHub ID vem como número)
        const githubId = String(rawGithubId);
        // @ts-ignore - Usa o login (username) do GitHub, não o name (nome completo)
        const username = session.user.login || session.user.name || "";
        const email = session.user.email || "";

        console.log("Sync: Starting sync for user:", { githubId, username, email });
        console.log("Sync: Selected repos:", selectedRepoIds.length);
        console.log("Sync: Total repos to sync:", repositories.length);
        console.log("Sync: Portfolio items:", Object.keys(portfolioItems).length);

        if (!rawGithubId) {
            console.error("Sync: No githubId found in session");
            return NextResponse.json({ error: "ID do GitHub não encontrado na sessão" }, { status: 400 });
        }

        if (!username) {
            console.error("Sync: No username found in session");
            return NextResponse.json({ error: "Username não encontrado na sessão" }, { status: 400 });
        }

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

        console.log("Sync: Completed successfully");
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Sync: Error during sync:", error);
        console.error("Sync: Error message:", error.message);
        console.error("Sync: Error stack:", error.stack);
        return NextResponse.json({
            error: "Falha ao sincronizar dados",
            details: error.message
        }, { status: 500 });
    }
}
