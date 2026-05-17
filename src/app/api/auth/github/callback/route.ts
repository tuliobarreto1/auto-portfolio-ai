import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { bareClient, authedClient } from "@/lib/infraforge";
import { setSessionCookie } from "@/lib/session";
import { upsertProfile, setGithubToken } from "@/lib/db";

// Credenciais da identidade no InfraForge derivadas do id numerico do
// GitHub (imutavel) - assim a mesma conta GitHub mapeia sempre para o
// mesmo usuario InfraForge, independente de mudancas de email/username.
function identityCreds(githubId: string) {
  const email = `${githubId}@users.noreply.github.com`;
  const password = crypto
    .createHmac("sha256", process.env.SESSION_COOKIE_SECRET!)
    .update(`gh-identity:${githubId}`)
    .digest("hex");
  return { email, password };
}

async function infraforgeLogin(email: string, password: string): Promise<string> {
  const client = bareClient();

  let res = await client.auth.signIn({ email, password });
  if (res.token) return res.token;
  if (res.pending) {
    throw new Error("Identidade pendente de aprovação no InfraForge.");
  }

  // conta ainda nao existe -> cria e tenta logar de novo
  const signup = await client.auth.signUp({ email, password });
  if (signup.error) {
    throw new Error(`Cadastro no InfraForge falhou: ${signup.error}`);
  }

  res = await client.auth.signIn({ email, password });
  if (res.token) return res.token;
  if (res.pending) {
    throw new Error(
      "Identidade criada, porém pendente de aprovação do administrador no InfraForge.",
    );
  }
  throw new Error(`Login no InfraForge falhou: ${res.error ?? "desconhecido"}`);
}

function decodeSub(jwt: string): string {
  const payload = jwt.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).sub;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("gh_oauth_state")?.value;

  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/?error=${encodeURIComponent(msg)}`, req.url));

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("Falha na verificacao do login");
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
    if (!ghToken) return fail("GitHub nao retornou access_token");

    // 2. perfil do GitHub
    const ghHeaders = {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "auto-portfolio-ai",
    };
    const ghUser = await fetch("https://api.github.com/user", {
      headers: ghHeaders,
    }).then((r) => r.json());
    const githubId = String(ghUser.id);
    const username: string = ghUser.login;

    let email: string | null = ghUser.email ?? null;
    if (!email) {
      const emails = await fetch("https://api.github.com/user/emails", {
        headers: ghHeaders,
      })
        .then((r) => r.json())
        .catch(() => []);
      if (Array.isArray(emails)) {
        const primary =
          emails.find((e: { primary?: boolean; verified?: boolean }) => e.primary && e.verified) ??
          emails[0];
        email = primary?.email ?? null;
      }
    }

    // 3. identidade no InfraForge
    const creds = identityCreds(githubId);
    const jwt = await infraforgeLogin(creds.email, creds.password);
    const userId = decodeSub(jwt);

    // 4. profile + token do GitHub (criptografado), sob o RLS do usuario
    const client = authedClient(jwt);
    await upsertProfile(client, { id: userId, githubId, username, email });
    await setGithubToken(client, userId, ghToken);

    // 5. sessao
    await setSessionCookie(jwt);
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.delete("gh_oauth_state");
    return res;
  } catch (err) {
    console.error("Erro no callback do GitHub:", err);
    return fail("Erro ao concluir o login");
  }
}
