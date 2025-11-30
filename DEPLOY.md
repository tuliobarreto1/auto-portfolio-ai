# Guia de Deploy na Vercel

## Pré-requisitos
- Conta na Vercel
- Repositório no GitHub com o código do projeto

## Passos para Deploy

### 1. Conectar o Projeto à Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New" → "Project"
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente (ver abaixo)

### 2. Configurar Vercel Postgres
1. No dashboard do seu projeto na Vercel, vá em "Storage"
2. Clique em "Create Database"
3. Escolha "Postgres"
4. Clique em "Create"
5. A Vercel vai automaticamente adicionar as variáveis de ambiente necessárias:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` (use esta como DATABASE_URL)
   - `POSTGRES_URL_NON_POOLING`

### 3. Configurar Variáveis de Ambiente na Vercel

Vá em Settings → Environment Variables e adicione:

```
AUTH_SECRET=seu-secret-gerado-com-openssl
AUTH_GITHUB_ID=seu-github-oauth-app-id
AUTH_GITHUB_SECRET=seu-github-oauth-app-secret
OPENAI_API_KEY=sua-api-key-openai-ou-deepseek
AI_PROVIDER=openai
DATABASE_URL=$POSTGRES_PRISMA_URL
```

**IMPORTANTE**: No GitHub OAuth App, adicione as URLs da Vercel:
- Homepage URL: `https://seu-app.vercel.app`
- Authorization callback URL: `https://seu-app.vercel.app/api/auth/callback/github`

### 4. Executar Migrations

Você tem duas opções:

#### Opção A: Via Script de Build (Automático)
A migration já está configurada no `package.json` para rodar automaticamente durante o build.

#### Opção B: Via Vercel CLI (Manual)
```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça login
vercel login

# Puxe as variáveis de ambiente
vercel env pull .env.production

# Execute a migration
npx prisma migrate deploy
```

### 5. Deploy

Após configurar tudo, faça push para o GitHub:
```bash
git add .
git commit -m "Configurar para deploy na Vercel"
git push origin main
```

A Vercel vai automaticamente:
1. Detectar o push
2. Executar `npm run build` (que inclui `prisma generate`)
3. Fazer o deploy

### 6. Verificar Logs

Se houver problemas:
1. Vá no dashboard da Vercel
2. Clique no deployment
3. Verifique os logs em "Build Logs" ou "Function Logs"

## Importante: Windows vs WSL

Se você estiver desenvolvendo no **Windows com WSL**:

O Prisma schema está configurado com `binaryTargets = ["native", "debian-openssl-3.0.x"]` para suportar ambos os ambientes.

- **"native"** - detecta automaticamente seu sistema (Windows ou Linux)
- **"debian-openssl-3.0.x"** - para WSL/Linux (Vercel também usa isso)

Após qualquer mudança no schema, sempre rode:
```bash
npx prisma generate
```

Isso vai gerar os binários corretos para sua plataforma atual.

## Desenvolvimento Local com PostgreSQL

Se quiser usar PostgreSQL localmente (recomendado para evitar diferenças entre dev e produção):

### Opção 1: PostgreSQL Local
```bash
# Instale PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# Linux: sudo apt install postgresql

# Crie o banco
createdb autoportfolio

# Atualize o .env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/autoportfolio"

# Execute as migrations
npx prisma migrate dev
```

### Opção 2: Serviços Cloud Gratuitos
- [Neon](https://neon.tech) - PostgreSQL serverless gratuito
- [Supabase](https://supabase.com) - PostgreSQL com extras gratuitos
- [Railway](https://railway.app) - PostgreSQL gratuito (limite de horas)

Basta criar um banco nesses serviços e copiar a connection string para o `.env`.

## SQLite vs PostgreSQL

### Desenvolvimento Local (Atual: SQLite)

Por padrão, o projeto está configurado com **SQLite** para facilitar o desenvolvimento local:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

```env
# .env
DATABASE_URL="file:./dev.db"
```

Isso é perfeito para desenvolvimento pois:
- ✅ Não precisa instalar servidor de banco
- ✅ Banco fica em um arquivo local
- ✅ Fácil de resetar/limpar

### Deploy na Vercel (PostgreSQL)

Quando for fazer deploy na Vercel, você precisa mudar para PostgreSQL:

1. **Edite `prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"  // Mudou de "sqlite" para "postgresql"
  url      = env("DATABASE_URL")
}
```

2. **Na Vercel, configure:**
```
DATABASE_URL=$POSTGRES_PRISMA_URL
```

3. **Recrie as migrations para PostgreSQL:**
```bash
# Delete as migrations antigas
rm -rf prisma/migrations

# Crie uma nova migration inicial
npx prisma migrate dev --name init
```

4. **Faça deploy:**
```bash
git add .
git commit -m "Configurar PostgreSQL para produção"
git push origin main
```

### Desenvolvimento Local com PostgreSQL (Opcional)

Se quiser desenvolver localmente com PostgreSQL para ter paridade completa com produção, veja a seção "Desenvolvimento Local com PostgreSQL" abaixo.

## Troubleshooting

### Erro: "Prisma Client not found"
```bash
npx prisma generate
npm run build
```

### Erro: "Database connection failed"
- Verifique se `DATABASE_URL` está corretamente configurada
- Use `$POSTGRES_PRISMA_URL` na Vercel (com pooling)

### Erro: "Table does not exist"
```bash
# Execute as migrations manualmente
npx prisma migrate deploy
```

### Erro 500 nas rotas de API
- Verifique os Function Logs na Vercel
- Certifique-se de que todas as variáveis de ambiente estão configuradas
- Verifique se o GitHub OAuth callback está correto

## Custos

- **Vercel**: Hobby plan gratuito (suficiente para maioria dos casos)
- **Vercel Postgres**: 256MB gratuito, depois ~$20/GB/mês
- **Alternativas gratuitas**: Neon (3GB free), Supabase (500MB free)
