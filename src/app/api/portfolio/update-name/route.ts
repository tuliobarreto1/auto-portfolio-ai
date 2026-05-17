import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { updateDisplayName } from "@/lib/db";

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    try {
        const { displayName } = await req.json();

        if (!displayName || displayName.trim() === "") {
            return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 });
        }

        await updateDisplayName(
            authedClient(session.jwt),
            session.userId,
            displayName.trim(),
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Erro ao atualizar nome:", error);
        return NextResponse.json({
            error: "Falha ao atualizar nome",
            details: error.message
        }, { status: 500 });
    }
}
