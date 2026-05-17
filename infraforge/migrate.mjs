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
//      para o storage S3/MinIO do InfraForge.
//   4. Gera infraforge/migrations/0002_data.sql com todos os INSERTs
//      (owner_id ja resolvido para UUID; file_url ja com a object key
//      do storage novo).
//
// Pre-requisitos:
//   npm install pg
//   .env com: NEON_DATABASE_URL, INFRAFORGE_URL, INFRAFORGE_API_KEY,
//             INFRAFORGE_PROJECT_SLUG, SESSION_COOKIE_SECRET,
//             STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY,
//             STORAGE_SECRET_KEY
//   O schema (0001_init.sql) ja aplicado no projeto InfraForge.
//   IMPORTANTE: cada usuario so e criado se o cadastro no InfraForge
//   for auto-aprovado (signUp normalmente fica "pendente").
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
import * as Minio from "minio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Variavel de ambiente ausente: ${k}`);
  return v;
};

const IF_CONFIG = {
  url: env("INFRAFORGE_URL"),
  projectSlug: env("INFRAFORGE_PROJECT_SLUG"),
  apiKey: env("INFRAFORGE_API_KEY"),
};

const storage = new Minio.Client({
  endPoint: new URL(env("STORAGE_ENDPOINT")).hostname,
  port: 443,
  useSSL: true,
  pathStyle: true,
  accessKey: env("STORAGE_ACCESS_KEY"),
  secretKey: env("STORAGE_SECRET_KEY"),
});
const BUCKET = env("STORAGE_BUCKET");

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

// cria/loga a identidade InfraForge -> uuid (auth.users.id)
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
  return decodeSub(res.token);
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

async function uploadToStorage(key, buffer, mime) {
  await storage.putObject(BUCKET, key, buffer, buffer.length, {
    "Content-Type": mime,
  });
  return key;
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

  // 1. identidades InfraForge  ->  mapa cuid -> uuid
  const idMap = new Map();
  for (const u of users) {
    const uuid = await provisionIdentity(String(u.githubId));
    idMap.set(u.id, uuid);
    console.log(`  identidade: ${u.username} (${u.githubId}) -> ${uuid}`);
  }
  const uuidOf = (oldUserId) => idMap.get(oldUserId);

  // 2. migra arquivos de curriculo para o storage InfraForge
  const newKeys = new Map(); // resume.id -> { fileUrl, enhancedFileUrl }  (object keys)
  for (const r of resumes) {
    const uuid = uuidOf(r.userId);
    const out = { fileUrl: r.fileUrl, enhancedFileUrl: r.enhancedFileUrl };
    const ext = r.fileType === "pdf" ? "pdf" : "docx";
    const mime = r.fileType === "pdf" ? "application/pdf" : DOCX_MIME;

    for (const field of ["fileUrl", "enhancedFileUrl"]) {
      const src = r[field];
      if (!src) continue;
      const buf = await readSource(src);
      if (!buf) continue;
      const key = `resumes/${uuid}-migrated-${field}.${ext}`;
      await uploadToStorage(key, buf, mime);
      out[field] = key;
      console.log(`  arquivo: ${src} -> ${key}`);
    }
    newKeys.set(r.id, out);
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
    const keys = newKeys.get(r.id) ?? {
      fileUrl: r.fileUrl,
      enhancedFileUrl: r.enhancedFileUrl,
    };
    lines.push(
      `INSERT INTO public.resumes (owner_id, original_file_name, file_name, file_type, file_url, enhanced_file_url, is_enhanced, template_type, structured_data, created_at, updated_at) VALUES (` +
        `${sLit(uuidOf(r.userId))}, ${sLit(r.originalFileName)}, ${sLit(r.fileName)}, ` +
        `${sLit(r.fileType)}, ${sLit(keys.fileUrl)}, ${sLit(keys.enhancedFileUrl)}, ` +
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
