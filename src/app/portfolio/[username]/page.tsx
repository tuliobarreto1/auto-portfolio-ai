import { PortfolioPreview } from "@/components/portfolio-preview";
import { prisma } from "@/lib/prisma";
import { use } from "react";

export default async function PortfolioPage({ params }: { params: Promise<{ username: string }> }) {
    const resolvedParams = use(params);
    const username = decodeURIComponent(resolvedParams.username);

    // Busca o usuário pelo username
    const user = await prisma.user.findFirst({
        where: { username },
        include: {
            repositories: {
                where: { selected: true },
            },
            portfolioItems: true,
        },
    });

    if (!user || user.repositories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Nenhum projeto disponível para este usuário.</p>
            </div>
        );
    }

    // Formata os repositórios para o formato esperado
    const repos = user.repositories.map((repo) => ({
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
    const items: Record<number, any> = {};
    for (const item of user.portfolioItems) {
        items[item.repoId] = {
            repoId: item.repoId,
            objective: item.objective,
            features: item.features,
            technicalSummary: item.technicalSummary,
            demoUrl: item.demoUrl,
            recordingUrl: item.recordingUrl,
        };
    }

    return (
        <PortfolioPreview
            repos={repos}
            items={items}
            username={username}
        />
    );
}
