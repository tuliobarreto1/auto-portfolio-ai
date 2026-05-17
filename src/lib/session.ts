import { cookies } from "next/headers";

const COOKIE = "if_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export interface ServerSession {
  userId: string; // auth.users.id (UUID) = claim `sub` do JWT do InfraForge
  jwt: string;
}

// Decodifica claims do JWT sem verificar assinatura: o cookie e httpOnly e
// foi setado pelo proprio servidor; o InfraForge revalida o JWT a cada query.
function decodeClaims(jwt: string): { sub?: string; exp?: number } | null {
  try {
    const payload = jwt.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<ServerSession | null> {
  const jwt = (await cookies()).get(COOKIE)?.value;
  if (!jwt) return null;
  const claims = decodeClaims(jwt);
  if (!claims || typeof claims.sub !== "string") return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) return null; // JWT expirado
  return { userId: claims.sub, jwt };
}

// Chamar apenas em Route Handlers ou Server Actions.
export async function setSessionCookie(jwt: string): Promise<void> {
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
