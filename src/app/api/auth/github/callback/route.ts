import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { authedClient } from "@/lib/infraforge";
import { setGithubIdentity, setGithubToken } from "@/lib/db";

// Callback do OAuth do GitHub: vincula a conta do GitHub (e o token com
// escopo `repo`) ao usuario JA logado via InfraForge.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gh_oauth_state")?.value;

  const back = (msg?: string) => {
    const res = NextResponse.redirect(
      new URL(
        msg ? `/dashboard?error=${encodeURIComponent(msg)}` : "/dashboard",
        req.url,
      ),
    );
    res.cookies.delete("gh_oauth_state");
    return res;
  };

  const session = await getServerSession();
  if (!session) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!code || !state || !cookieState || state !== cookieState) {
    return back("Falha na verificação do GitHub");
  }

  try {
    // 1. troca o code pelo access_token do GitHub
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GH_CLIENT_ID,
        client_secret: process.env.GH_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.APP_URL}/api/auth/github/callback`,
      }),
    });
    const ghToken: string | undefined = (await tokenRes.json()).access_token;
    if (!ghToken) return back("GitHub não retornou access_token");

    // 2. perfil do GitHub
    const ghUser = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "auto-portfolio-ai",
      },
    }).then((r) => r.json());
    const githubId = String(ghUser.id);
    const username: string = ghUser.login;

    // 3. vincula ao usuario logado + guarda o token (criptografado)
    const client = authedClient(session.jwt);
    try {
      await setGithubIdentity(client, session.userId, githubId, username);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (/unique|duplicate/i.test(msg)) {
        return back("Esta conta do GitHub já está vinculada a outro usuário.");
      }
      throw err;
    }
    await setGithubToken(client, session.userId, ghToken);

    return back();
  } catch (err) {
    console.error("Erro ao conectar GitHub:", err);
    return back("Erro ao conectar com o GitHub");
  }
}
