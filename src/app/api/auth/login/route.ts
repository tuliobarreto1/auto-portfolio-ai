import { NextResponse } from "next/server";
import { bareClient, authedClient } from "@/lib/infraforge";
import { setSessionCookie } from "@/lib/session";
import { ensureProfile } from "@/lib/db";

// Login na aplicacao via identidade InfraForge (email + senha).
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 },
      );
    }

    const res = await bareClient().auth.signIn({ email, password });

    if (res.pending) {
      return NextResponse.json(
        {
          pending: true,
          message:
            "Conta aguardando aprovação do administrador ou verificação de email.",
        },
        { status: 403 },
      );
    }
    if (!res.token || !res.user) {
      return NextResponse.json(
        { error: res.error ?? "Email ou senha inválidos" },
        { status: 401 },
      );
    }

    // garante o profile da identidade e abre a sessao
    await ensureProfile(authedClient(res.token), res.user.id, res.user.email);
    await setSessionCookie(res.token);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro no login:", err);
    return NextResponse.json(
      { error: err.message ?? "Erro ao fazer login" },
      { status: 500 },
    );
  }
}
