// ATENCAO: o @infraforge/sdk 0.2.1 NAO expoe um modulo de storage
// (createClient devolve apenas { auth, db }). Esta implementacao chama
// a API HTTP de storage do InfraForge diretamente. O contrato abaixo
// (rota, campos do multipart, resposta) e a melhor aproximacao a partir
// da documentacao e PRECISA ser confirmado contra a plataforma real.

// URL publica de um objeto no storage do InfraForge.
export function publicUrl(path: string): string {
  const base = (process.env.INFRAFORGE_STORAGE_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}

// Faz upload de um arquivo e devolve a URL publica.
export async function uploadPublicFile(
  jwt: string,
  path: string,
  data: Blob,
  contentType: string,
): Promise<string> {
  const form = new FormData();
  form.append("path", path);
  form.append("contentType", contentType);
  form.append("file", data, path.split("/").pop() ?? "file");

  const res = await fetch(
    `${process.env.INFRAFORGE_URL}/api/storage/${process.env.INFRAFORGE_PROJECT}`,
    {
      method: "POST",
      headers: {
        "x-infraforge-key": process.env.INFRAFORGE_API_KEY!,
        Authorization: `Bearer ${jwt}`,
      },
      body: form,
    },
  );

  if (!res.ok) {
    throw new Error(
      `Upload para o storage falhou (${res.status}): ${await res.text()}`,
    );
  }
  return publicUrl(path);
}
