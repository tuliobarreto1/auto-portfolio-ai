// ============================================================
// Migracao de dados Neon -> InfraForge  (Fase 5)
//
// O que faz:
//   1. Le os dados do Postgres antigo (Neon).
//   2. Cria a identidade InfraForge de cada usuario (auth.signUp),
//      usando as MESMAS credenciais deterministicas do callback de
//      login -> no primeiro login pos-migracao o usuario cai na conta
//      certa. Monta o mapa  User.id (cuid) -> auth.users.id (uuid).
//   3. Baixa cada arquivo de curriculo (Vercel Blob ou local) e sobe
//      para o storage do InfraForge.
//   4. Gera infraforge/migrations/0002_data.sql com todos os INSERTs
//      (owner_id ja resolvido para UUID, file_url ja apontando para o
//      storage novo).
//
// Pre-requisitos:
//   npm install pg
//   .env com: NEON_DATABASE_URL, INFRAFORGE_URL, INFRAFORGE_API_KEY,
//             INFRAFORGE_PROJECT, INFRAFORGE_STORAGE_PUBLIC_URL,
//             SESSION_COOKIE_SECRET
//   O schema (0001_init.sql) ja aplicado no projeto InfraForge.
//   IMPORTANTE: cada usuario so e criado se o cadastro no InfraForge
//   for auto-aprovado (signUp normalmente retorna "pendente").
//
// Como rodar:
//   node --env-file=.env infraforge/migrate.mjs
//   # revise o SQL gerado e entao:
//   infraforge sql -f infraforge/migrations/0002_data.sql
//
// Observacao: o github access_token NAO e migrado (o NextAuth nao o
// persistia). github_credentials e repovoado no primeiro login.
// ============================================================

import pg from "pg";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@infraforge/sdk";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Variavel de ambiente ausente: ${k}`);
  return v;
};

const IF_CONFIG = {
  url: env("INFRAFORGE_URL"),
  projectSlug: env("INFRAFORGE_PROJECT"),
  apiKey: env("INFRAFORGE_API_KEY"),
};
const STORAGE_PUBLIC = env("INFRAFORGE_STORAGE_PUBLIC_URL").replace(/\/$/, "");

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// credenciais deterministicas iguais as do callback de login
function identityCreds(githubId) {
  return {
    email: `${githubId}@users.noreply.github.com`,
    password: crypto
      .createHmac("sha256", env("SESSION_COOKIE_SECRET"))
      .update(`gh-identity:${githubId}`)
      .digest("hex"),
  };
}

// --- helpers de literal SQL (dollar-quoting: seguro p/ texto arbitrario) ---
const DQ = "$mig$";
const sLit = (v) => (v == null ? "NULL" : `${DQ}${String(v)}${DQ}`);
const nLit = (v) => (v == null ? "NULL" : String(Number(v)));
const bLit = (v) => (v ? "true" : "false");
const tLit = (v) =>
  v == null ? "NULL" : `${DQ}${new Date(v).toISOString()}${DQ}`;
const jLit = (v) => (v == null ? "NULL" : `${DQ}${JSON.stringify(v)}${DQ}::jsonb`);

function decodeSub(jwt) {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"))
    .sub;
}

// cria/loga a identidade InfraForge -> { uuid, token }
async function provisionIdentity(githubId) {
  const creds = identityCreds(githubId);
  const client = createClient(IF_CONFIG);

  let res = await client.auth.signIn(creds);
  if (!res.token) {
    if (res.pending) {
      throw new Error(`Identidade ${githubId} pendente de aprovacao no InfraForge`);
    }
    const signup = await client.auth.signUp(creds);
    if (signup.error) {
      throw new Error(`signUp ${githubId} falhou: ${signup.error}`);
    }
    res = await client.auth.signIn(creds);
  }
  if (!res.token) {
    throw new Error(
      `Login ${githubId} falhou: ${res.pending ? "pendente de aprovacao" : res.error}`,
    );
  }
  return { uuid: decodeSub(res.token), token: res.token };
}

// baixa o conteudo de uma URL http(s) ou de um caminho local em public/
async function readSource(urlOrPath) {
  if (!urlOrPath) return null;
  if (/^https?:\/\//.test(urlOrPath)) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`download falhou (${res.status}): ${urlOrPath}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.join(ROOT, "public", urlOrPath));
}

// sobe um arquivo para o storage do InfraForge (API HTTP - vide src/lib/storage.ts)
async function uploadToStorage(jwt, destPath, buffer, mime) {
  const form = new FormData();
  form.append("path", destPath);
  form.append("contentType", mime);
  form.append(
    "file",
    new Blob([buffer], { type: mime }),
    destPath.split("/").pop(),
  );
  const res = await fetch(`${IF_CONFIG.url}/api/storage/${IF_CONFIG.projectSlug}`, {
    method: "POST",
    headers: {
      "x-infraforge-key": IF_CONFIG.apiKey,
      Authorization: `Bearer ${jwt}`,
    },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`upload falhou (${res.status}): ${await res.text()}`);
  }
  return `${STORAGE_PUBLIC}/${destPath}`;
}

async function main() {
  const neon = new pg.Client({
    connectionString: env("NEON_DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await neon.connect();

  const users = (await neon.query('SELECT * FROM "User"')).rows;
  const repos = (await neon.query('SELECT * FROM "Repository"')).rows;
  const items = (await neon.query('SELECT * FROM "PortfolioItem"')).rows;
  const resumes = (await neon.query('SELECT * FROM "Resume"')).rows;
  await neon.end();

  console.log(
    `Lido do Neon: ${users.length} users, ${repos.length} repos, ` +
      `${items.length} portfolio items, ${resumes.length} resumes`,
  );

  // 1. identidades InfraForge  ->  mapa cuid -> { uuid, token }
  const idMap = new Map();
  for (const u of users) {
    const id = await provisionIdentity(String(u.githubId));
    idMap.set(u.id, id);
    console.log(`  identidade: ${u.username} (${u.githubId}) -> ${id.uuid}`);
  }
  const uuidOf = (oldUserId) => idMap.get(oldUserId).uuid;

  // 2. migra arquivos de curriculo para o storage InfraForge
  const newUrls = new Map(); // resume.id -> { fileUrl, enhancedFileUrl }
  for (const r of resumes) {
    const { uuid, token } = idMap.get(r.userId);
    const out = { fileUrl: r.fileUrl, enhancedFileUrl: r.enhancedFileUrl };
    const ext = r.fileType === "pdf" ? "pdf" : "docx";
    const mime = r.fileType === "pdf" ? "application/pdf" : DOCX_MIME;

    for (const field of ["fileUrl", "enhancedFileUrl"]) {
      const src = r[field];
      if (!src) continue;
      const buf = await readSource(src);
      if (!buf) continue;
      const dest = `resumes/${uuid}-migrated-${field}.${ext}`;
      out[field] = await uploadToStorage(token, dest, buf, mime);
      console.log(`  arquivo: ${src} -> ${out[field]}`);
    }
    newUrls.set(r.id, out);
  }

  // 3. gera o SQL de dados
  const lines = [];
  lines.push("-- Dados migrados de Neon para InfraForge (gerado por migrate.mjs)");
  lines.push("BEGIN;");
  lines.push("");

  lines.push("-- profiles");
  for (const u of users) {
    lines.push(
      `INSERT INTO public.profiles (id, github_id, username, display_name, email, created_at, updated_at) VALUES (` +
        `${sLit(uuidOf(u.id))}, ${sLit(String(u.githubId))}, ${sLit(u.username)}, ` +
        `${sLit(u.displayName)}, ${sLit(u.email)}, ${tLit(u.createdAt)}, ${tLit(u.updatedAt)});`,
    );
  }
  lines.push("");

  lines.push("-- repositories");
  for (const r of repos) {
    lines.push(
      `INSERT INTO public.repositories (owner_id, github_repo_id, name, full_name, description, html_url, language, stargazers_count, repo_updated_at, private, selected) VALUES (` +
        `${sLit(uuidOf(r.userId))}, ${nLit(r.id)}, ${sLit(r.name)}, ${sLit(r.fullName)}, ` +
        `${sLit(r.description)}, ${sLit(r.htmlUrl)}, ${sLit(r.language)}, ${nLit(r.stargazersCount)}, ` +
        `${tLit(r.updatedAt)}, ${bLit(r.private)}, ${bLit(r.selected)});`,
    );
  }
  lines.push("");

  lines.push("-- portfolio_items");
  for (const it of items) {
    lines.push(
      `INSERT INTO public.portfolio_items (owner_id, github_repo_id, objective, features, technical_summary, demo_url, recording_url, created_at, updated_at) VALUES (` +
        `${sLit(uuidOf(it.userId))}, ${nLit(it.repoId)}, ${sLit(it.objective)}, ${sLit(it.features)}, ` +
        `${sLit(it.technicalSummary)}, ${sLit(it.demoUrl)}, ${sLit(it.recordingUrl)}, ` +
        `${tLit(it.createdAt)}, ${tLit(it.updatedAt)});`,
    );
  }
  lines.push("");

  lines.push("-- resumes");
  for (const r of resumes) {
    const urls = newUrls.get(r.id) ?? {
      fileUrl: r.fileUrl,
      enhancedFileUrl: r.enhancedFileUrl,
    };
    lines.push(
      `INSERT INTO public.resumes (owner_id, original_file_name, file_name, file_type, file_url, enhanced_file_url, is_enhanced, template_type, structured_data, created_at, updated_at) VALUES (` +
        `${sLit(uuidOf(r.userId))}, ${sLit(r.originalFileName)}, ${sLit(r.fileName)}, ` +
        `${sLit(r.fileType)}, ${sLit(urls.fileUrl)}, ${sLit(urls.enhancedFileUrl)}, ` +
        `${bLit(r.isEnhanced)}, ${sLit(r.templateType)}, ${jLit(r.structuredData)}, ` +
        `${tLit(r.createdAt)}, ${tLit(r.updatedAt)});`,
    );
  }
  lines.push("");
  lines.push("COMMIT;");

  const outFile = path.join(ROOT, "infraforge", "migrations", "0002_data.sql");
  await fs.writeFile(outFile, lines.join("\n") + "\n", "utf8");
  console.log(`\nSQL gerado: ${outFile}`);
  console.log("Revise e aplique com:  infraforge sql -f infraforge/migrations/0002_data.sql");
}

main().catch((err) => {
  console.error("Falha na migracao:", err);
  process.exit(1);
});
