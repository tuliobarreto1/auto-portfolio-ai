import { NextResponse } from "next/server";
import { bareClient } from "@/lib/infraforge";

// Cadastro de uma nova identidade InfraForge (email + senha).
// O InfraForge exige aprovacao do admin ou verificacao de email antes
// do primeiro login - por isso aqui so criamos a conta.
export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 },
      );
    }

    const res = await bareClient().auth.signUp({ email, password, name });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message:
        res.message ??
        "Conta criada. Verifique seu email ou aguarde a aprovação do administrador para poder entrar.",
    });
  } catch (err: any) {
    console.error("Erro no cadastro:", err);
    return NextResponse.json(
      { error: err.message ?? "Erro ao criar conta" },
      { status: 500 },
    );
  }
}
