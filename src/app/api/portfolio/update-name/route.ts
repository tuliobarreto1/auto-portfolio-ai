import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { displayName } = await req.json();

        // @ts-ignore
        const rawGithubId = session.user.id || session.userId;
        const githubId = String(rawGithubId);

        if (!displayName || displayName.trim() === "") {
            return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 });
        }

        // Atualiza o displayName do usuário
        await prisma.user.update({
            where: { githubId },
            data: { displayName: displayName.trim() },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Erro ao atualizar nome:", error);
        return NextResponse.json({
            error: "Falha ao atualizar nome",
            details: error.message
        }, { status: 500 });
    }
}
