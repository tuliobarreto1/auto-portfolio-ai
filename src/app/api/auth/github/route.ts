import { NextResponse } from "next/server";
import crypto from "crypto";

// Inicia o fluxo OAuth do GitHub (App proprio - Plano B).
// Escopo `repo` para ler repositorios publicos e privados via Octokit.
export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GH_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/auth/github/callback`,
    scope: "read:user user:email repo",
    state,
    allow_signup: "true",
  });

  const res = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
  res.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
