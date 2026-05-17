import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import {
    getProfileById,
    upsertRepositories,
    upsertPortfolioItem,
    deletePortfolioItem,
} from "@/lib/db";

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { repositories, portfolioItems, selectedRepoIds } = await req.json();
        const client = authedClient(session.jwt);

        const profile = await getProfileById(client, session.userId);
        if (!profile) {
            return NextResponse.json(
                { error: "Perfil não encontrado. Faça login novamente." },
                { status: 401 },
            );
        }

        // Repositorios primeiro (portfolio_items tem FK para repositories).
        await upsertRepositories(client, session.userId, repositories, selectedRepoIds);

        for (const [repoId, item] of Object.entries(portfolioItems)) {
            const itemData = item as any;
            const id = parseInt(repoId);

            if (
                !itemData.objective &&
                !itemData.features &&
                !itemData.technicalSummary &&
                !itemData.demoUrl &&
                !itemData.recordingUrl
            ) {
                await deletePortfolioItem(client, session.userId, id);
                continue;
            }

            await upsertPortfolioItem(client, session.userId, {
                repoId: id,
                objective: itemData.objective,
                features: itemData.features,
                technicalSummary: itemData.technicalSummary,
                demoUrl: itemData.demoUrl,
                recordingUrl: itemData.recordingUrl,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Sync: Error during sync:", error);
        return NextResponse.json({
            error: "Falha ao sincronizar dados",
            details: error.message,
        }, { status: 500 });
    }
}
