import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { getSelectedRepositories, getPortfolioItems } from "@/lib/db";

export async function GET() {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const client = authedClient(session.jwt);

        const repositories = await getSelectedRepositories(client, session.userId);
        const items = await getPortfolioItems(client, session.userId);

        const selectedRepos = repositories.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.fullName,
            description: repo.description,
            html_url: repo.htmlUrl,
            language: repo.language,
            stargazers_count: repo.stargazersCount,
            updated_at: repo.updatedAt,
            private: repo.private,
        }));

        const portfolioItems: Record<number, any> = {};
        for (const item of items) {
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
    } catch (error: any) {
        console.error("Load: Error loading portfolio:", error);
        return NextResponse.json({
            error: "Falha ao carregar dados",
            details: error.message
        }, { status: 500 });
    }
}
