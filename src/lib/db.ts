import type { InfraForgeClient } from "./infraforge";
import { encryptToken, decryptToken } from "./crypto";

// ============================================================
// Camada de acesso a dados sobre o InfraForge SDK.
// Todas as queries passam por client.db.query() com RLS.
// As funcoes retornam objetos em camelCase (aliases no SQL) para
// manter as rotas proximas do formato antigo do Prisma.
// ============================================================

export interface Profile {
  id: string;
  githubId: string | null;
  username: string | null;
  displayName: string | null;
  email: string | null;
}

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
  private: boolean;
  selected: boolean;
}

export interface PortfolioItemRow {
  repoId: number;
  objective: string | null;
  features: string | null;
  technicalSummary: string | null;
  demoUrl: string | null;
  recordingUrl: string | null;
}

export interface PortfolioItemWithRepo extends PortfolioItemRow {
  repoName: string;
  repoDescription: string | null;
  repoLanguage: string | null;
  repoHtmlUrl: string;
}

export interface ResumeRow {
  id: string;
  originalFileName: string;
  fileName: string;
  fileType: string;
  // fileUrl / enhancedFileUrl guardam a object KEY do storage S3,
  // nao uma URL. Use presignedUrl() para gerar o link do navegador.
  fileUrl: string;
  enhancedFileUrl: string | null;
  isEnhanced: boolean;
  templateType: string;
  structuredData: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomingRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

async function rows<T>(
  c: InfraForgeClient,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { data, error } = await c.db.query<T>(sql, params);
  if (error) {
    const msg =
      typeof error === "string" ? error : ((error as { message?: string }).message ?? "erro");
    throw new Error(`InfraForge query falhou: ${msg}`);
  }
  return (data as T[]) ?? [];
}

async function first<T>(
  c: InfraForgeClient,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const r = await rows<T>(c, sql, params);
  return r[0] ?? null;
}

// ---------------- profiles ----------------

const PROFILE_COLS = `
  id, github_id AS "githubId", username,
  display_name AS "displayName", email`;

export function getProfileById(c: InfraForgeClient, id: string) {
  return first<Profile>(c, `SELECT ${PROFILE_COLS} FROM profiles WHERE id = $1`, [id]);
}

export function getProfileByUsername(c: InfraForgeClient, username: string) {
  return first<Profile>(
    c,
    `SELECT ${PROFILE_COLS} FROM profiles WHERE username = $1`,
    [username],
  );
}

// Cria o profile minimo logo apos o login (identidade InfraForge).
export async function ensureProfile(
  c: InfraForgeClient,
  id: string,
  email: string | null,
): Promise<void> {
  await rows(
    c,
    `INSERT INTO profiles (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
    [id, email],
  );
}

// Vincula a conta do GitHub ao profile (apos o OAuth de conexao).
export async function setGithubIdentity(
  c: InfraForgeClient,
  id: string,
  githubId: string,
  username: string,
): Promise<void> {
  await rows(
    c,
    `UPDATE profiles SET github_id = $2, username = $3 WHERE id = $1`,
    [id, githubId, username],
  );
}

export async function updateDisplayName(
  c: InfraForgeClient,
  id: string,
  displayName: string,
): Promise<void> {
  await rows(c, `UPDATE profiles SET display_name = $2 WHERE id = $1`, [
    id,
    displayName,
  ]);
}

// ---------------- github_credentials ----------------

export async function setGithubToken(
  c: InfraForgeClient,
  userId: string,
  plainToken: string,
): Promise<void> {
  await rows(
    c,
    `INSERT INTO github_credentials (user_id, access_token)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET access_token = EXCLUDED.access_token`,
    [userId, encryptToken(plainToken)],
  );
}

export async function getGithubToken(
  c: InfraForgeClient,
  userId: string,
): Promise<string | null> {
  const row = await first<{ accessToken: string }>(
    c,
    `SELECT access_token AS "accessToken" FROM github_credentials WHERE user_id = $1`,
    [userId],
  );
  return row ? decryptToken(row.accessToken) : null;
}

// ---------------- repositories ----------------

const REPO_COLS = `
  github_repo_id AS "id", name, full_name AS "fullName", description,
  html_url AS "htmlUrl", language, stargazers_count AS "stargazersCount",
  repo_updated_at AS "updatedAt", private, selected`;

export function getSelectedRepositories(c: InfraForgeClient, ownerId: string) {
  return rows<Repo>(
    c,
    `SELECT ${REPO_COLS} FROM repositories
     WHERE owner_id = $1 AND selected = true
     ORDER BY name`,
    [ownerId],
  );
}

export async function upsertRepositories(
  c: InfraForgeClient,
  ownerId: string,
  repos: IncomingRepo[],
  selectedIds: number[],
): Promise<void> {
  if (repos.length === 0) return;
  const selected = new Set(selectedIds);
  const COLS = 11;
  const tuples: string[] = [];
  const params: unknown[] = [];
  repos.forEach((r, i) => {
    const b = i * COLS;
    tuples.push(
      `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`,
    );
    params.push(
      ownerId,
      r.id,
      r.name,
      r.full_name,
      r.description ?? null,
      r.html_url,
      r.language ?? null,
      r.stargazers_count ?? 0,
      r.updated_at ?? null,
      !!r.private,
      selected.has(r.id),
    );
  });
  await rows(
    c,
    `INSERT INTO repositories
       (owner_id, github_repo_id, name, full_name, description, html_url,
        language, stargazers_count, repo_updated_at, private, selected)
     VALUES ${tuples.join(",")}
     ON CONFLICT (owner_id, github_repo_id) DO UPDATE SET
       name = EXCLUDED.name,
       full_name = EXCLUDED.full_name,
       description = EXCLUDED.description,
       html_url = EXCLUDED.html_url,
       language = EXCLUDED.language,
       stargazers_count = EXCLUDED.stargazers_count,
       repo_updated_at = EXCLUDED.repo_updated_at,
       private = EXCLUDED.private,
       selected = EXCLUDED.selected`,
    params,
  );
}

// ---------------- portfolio_items ----------------

export function getPortfolioItems(c: InfraForgeClient, ownerId: string) {
  return rows<PortfolioItemRow>(
    c,
    `SELECT github_repo_id AS "repoId", objective, features,
            technical_summary AS "technicalSummary", demo_url AS "demoUrl",
            recording_url AS "recordingUrl"
     FROM portfolio_items WHERE owner_id = $1`,
    [ownerId],
  );
}

export function getPortfolioItemsWithRepo(c: InfraForgeClient, ownerId: string) {
  return rows<PortfolioItemWithRepo>(
    c,
    `SELECT p.github_repo_id AS "repoId", p.objective, p.features,
            p.technical_summary AS "technicalSummary", p.demo_url AS "demoUrl",
            p.recording_url AS "recordingUrl",
            r.name AS "repoName", r.description AS "repoDescription",
            r.language AS "repoLanguage", r.html_url AS "repoHtmlUrl"
     FROM portfolio_items p
     JOIN repositories r
       ON r.owner_id = p.owner_id AND r.github_repo_id = p.github_repo_id
     WHERE p.owner_id = $1`,
    [ownerId],
  );
}

export async function upsertPortfolioItem(
  c: InfraForgeClient,
  ownerId: string,
  item: {
    repoId: number;
    objective?: string | null;
    features?: string | null;
    technicalSummary?: string | null;
    demoUrl?: string | null;
    recordingUrl?: string | null;
  },
): Promise<void> {
  await rows(
    c,
    `INSERT INTO portfolio_items
       (owner_id, github_repo_id, objective, features, technical_summary,
        demo_url, recording_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (owner_id, github_repo_id) DO UPDATE SET
       objective = EXCLUDED.objective,
       features = EXCLUDED.features,
       technical_summary = EXCLUDED.technical_summary,
       demo_url = EXCLUDED.demo_url,
       recording_url = EXCLUDED.recording_url`,
    [
      ownerId,
      item.repoId,
      item.objective ?? null,
      item.features ?? null,
      item.technicalSummary ?? null,
      item.demoUrl ?? null,
      item.recordingUrl ?? null,
    ],
  );
}

export async function deletePortfolioItem(
  c: InfraForgeClient,
  ownerId: string,
  repoId: number,
): Promise<void> {
  await rows(
    c,
    `DELETE FROM portfolio_items WHERE owner_id = $1 AND github_repo_id = $2`,
    [ownerId, repoId],
  );
}

// ---------------- resumes ----------------

const RESUME_COLS = `
  id, original_file_name AS "originalFileName", file_name AS "fileName",
  file_type AS "fileType", file_url AS "fileUrl",
  enhanced_file_url AS "enhancedFileUrl", is_enhanced AS "isEnhanced",
  template_type AS "templateType", structured_data AS "structuredData",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export function getResume(c: InfraForgeClient, ownerId: string) {
  return first<ResumeRow>(
    c,
    `SELECT ${RESUME_COLS} FROM resumes WHERE owner_id = $1`,
    [ownerId],
  );
}

// Upload de um novo arquivo: cria ou substitui, zerando a versao
// aprimorada e o cache de dados estruturados.
export async function upsertResumeFile(
  c: InfraForgeClient,
  ownerId: string,
  f: { originalFileName: string; fileType: string; fileUrl: string },
): Promise<void> {
  await rows(
    c,
    `INSERT INTO resumes (owner_id, original_file_name, file_type, file_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (owner_id) DO UPDATE SET
       original_file_name = EXCLUDED.original_file_name,
       file_type = EXCLUDED.file_type,
       file_url = EXCLUDED.file_url,
       enhanced_file_url = NULL,
       is_enhanced = false,
       structured_data = NULL`,
    [ownerId, f.originalFileName, f.fileType, f.fileUrl],
  );
}

export async function updateResumeGenerated(
  c: InfraForgeClient,
  ownerId: string,
  f: { fileUrl: string; fileName: string; templateType: string; structuredData: unknown },
): Promise<void> {
  await rows(
    c,
    `UPDATE resumes SET
       file_url = $2, file_name = $3, template_type = $4,
       structured_data = $5::jsonb
     WHERE owner_id = $1`,
    [ownerId, f.fileUrl, f.fileName, f.templateType, JSON.stringify(f.structuredData)],
  );
}

export async function updateResumeStructuredData(
  c: InfraForgeClient,
  ownerId: string,
  structuredData: unknown,
): Promise<void> {
  await rows(
    c,
    `UPDATE resumes SET structured_data = $2::jsonb WHERE owner_id = $1`,
    [ownerId, JSON.stringify(structuredData)],
  );
}

export async function clearResumeCache(
  c: InfraForgeClient,
  ownerId: string,
): Promise<void> {
  await rows(c, `UPDATE resumes SET structured_data = NULL WHERE owner_id = $1`, [
    ownerId,
  ]);
}

export async function updateResumeEnhanced(
  c: InfraForgeClient,
  ownerId: string,
  f: { enhancedFileUrl: string; isEnhanced: boolean },
): Promise<void> {
  await rows(
    c,
    `UPDATE resumes SET enhanced_file_url = $2, is_enhanced = $3 WHERE owner_id = $1`,
    [ownerId, f.enhancedFileUrl, f.isEnhanced],
  );
}

export async function deleteResume(
  c: InfraForgeClient,
  ownerId: string,
): Promise<void> {
  await rows(c, `DELETE FROM resumes WHERE owner_id = $1`, [ownerId]);
}
