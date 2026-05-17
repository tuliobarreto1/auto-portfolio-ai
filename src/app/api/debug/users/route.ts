import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { getProfileById, getSelectedRepositories, getPortfolioItems } from "@/lib/db";

// Endpoint de debug - sob RLS so e possivel inspecionar o proprio usuario.
export async function GET() {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const client = authedClient(session.jwt);
        const profile = await getProfileById(client, session.userId);
        const repos = await getSelectedRepositories(client, session.userId);
        const items = await getPortfolioItems(client, session.userId);

        return NextResponse.json({
            currentUser: {
                userId: session.userId,
                username: profile?.username,
                githubId: profile?.githubId,
                selectedRepos: repos.length,
                portfolioItems: items.length,
            },
        });
    } catch (error: any) {
        console.error("Debug error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
