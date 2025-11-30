import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    try {
        // Apenas para debug - remova em produção
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            include: {
                repositories: {
                    where: { selected: true }
                },
                portfolioItems: true,
            },
        });

        return NextResponse.json({
            total: users.length,
            users: users.map(u => ({
                username: u.username,
                githubId: u.githubId,
                selectedRepos: u.repositories.length,
                portfolioItems: u.portfolioItems.length,
            })),
            currentSession: {
                // @ts-ignore
                login: session.user?.login,
                name: session.user?.name,
                // @ts-ignore
                id: session.user?.id,
            }
        });
    } catch (error: any) {
        console.error("Debug error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
