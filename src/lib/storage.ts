import * as Minio from "minio";

// Storage S3 (MinIO) do projeto InfraForge. As tabelas guardam a object
// KEY (ex.: "resumes/<uuid>-<ts>.pdf"); a URL para o navegador e gerada
// sob demanda via presignedUrl() (o bucket nao e publico).

let cached: Minio.Client | null = null;

function client(): Minio.Client {
  if (cached) return cached;
  cached = new Minio.Client({
    endPoint: new URL(process.env.STORAGE_ENDPOINT!).hostname,
    port: 443,
    useSSL: true,
    pathStyle: true,
    accessKey: process.env.STORAGE_ACCESS_KEY!,
    secretKey: process.env.STORAGE_SECRET_KEY!,
  });
  return cached;
}

const bucket = () => process.env.STORAGE_BUCKET!;

// Sobe um arquivo e devolve a object key (a key e o que se guarda no banco).
export async function uploadFile(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  await client().putObject(bucket(), key, data, data.length, {
    "Content-Type": contentType,
  });
  return key;
}

// URL temporaria assinada para o navegador acessar o objeto (6h).
export function presignedUrl(key: string): Promise<string> {
  return client().presignedGetObject(bucket(), key, 6 * 60 * 60);
}

// Baixa o conteudo de um objeto (uso server-side: parse / enhance).
export async function downloadFile(key: string): Promise<Buffer> {
  const stream = await client().getObject(bucket(), key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
