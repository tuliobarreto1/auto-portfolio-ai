import { createClient } from "@infraforge/sdk";

export type InfraForgeClient = ReturnType<typeof createClient>;

function config() {
  return {
    url: process.env.INFRAFORGE_URL!,
    projectSlug: process.env.INFRAFORGE_PROJECT_SLUG!,
    apiKey: process.env.INFRAFORGE_API_KEY!,
  };
}

// Cliente sem token: usado apenas para signIn/signUp (operacoes de auth
// que nao exigem JWT).
export function bareClient(): InfraForgeClient {
  return createClient(config());
}

// Cliente autenticado como o usuario dono do JWT (RLS escopada ao usuario).
export function authedClient(jwt: string): InfraForgeClient {
  const client = createClient(config());
  client.auth.setToken(jwt);
  return client;
}

// O SDK exige um token em TODA query (db.query nao funciona anonimo).
// Para as paginas publicas usamos uma conta de servico dedicada: as
// policies de leitura publica (USING(true) / selected = true) sao
// satisfeitas por qualquer JWT valido, sem depender de auth.uid().
let cachedServiceToken: { value: string; exp: number } | null = null;

async function getServiceToken(): Promise<string> {
  if (cachedServiceToken && cachedServiceToken.exp > Date.now() + 60_000) {
    return cachedServiceToken.value;
  }
  const res = await bareClient().auth.signIn({
    email: process.env.INFRAFORGE_SERVICE_EMAIL!,
    password: process.env.INFRAFORGE_SERVICE_PASSWORD!,
  });
  if (!res.token) {
    throw new Error(
      `Login da conta de servico InfraForge falhou: ${res.error ?? "sem token"}`,
    );
  }
  let exp = Date.now() + 30 * 60_000;
  try {
    const claims = JSON.parse(
      Buffer.from(res.token.split(".")[1], "base64url").toString("utf8"),
    );
    if (claims.exp) exp = claims.exp * 1000;
  } catch {
    // mantem o fallback de 30 min
  }
  cachedServiceToken = { value: res.token, exp };
  return res.token;
}

// Cliente para leitura de dados publicos (portfolio/curriculo publicos).
export async function serviceClient(): Promise<InfraForgeClient> {
  return authedClient(await getServiceToken());
}
