# Checklist de Deploy na Vercel

## ❌ Problemas Comuns

Se você está vendo "Application error" ou os projetos não carregam, siga este checklist:

## 1️⃣ Configurar Vercel Postgres

### Passos:
1. Acesse o dashboard do seu projeto na Vercel
2. Vá em **Storage** (menu lateral)
3. Clique em **Create Database**
4. Escolha **Postgres**
5. Clique em **Create**
6. A Vercel vai criar automaticamente estas variáveis:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` ← **Use esta!**
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### ⚠️ IMPORTANTE:
A variável `DATABASE_URL` precisa apontar para `POSTGRES_PRISMA_URL`:

```
DATABASE_URL = $POSTGRES_PRISMA_URL
```

Na Vercel, você faz isso em:
**Settings → Environment Variables → Edit DATABASE_URL**

E coloca o valor: `$POSTGRES_PRISMA_URL` (com o cifrão!)

## 2️⃣ Mudar Schema do Prisma para PostgreSQL

**ANTES de fazer deploy**, você precisa mudar o provider no código:

### Edite `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // ← Mude de "sqlite" para "postgresql"
  url      = env("DATABASE_URL")
}
```

### Recrie as migrations:
```bash
# Delete migrations antigas
rm -rf prisma/migrations

# Crie nova migration para PostgreSQL
npx prisma migrate dev --name init
```

### Commit e push:
```bash
git add .
git commit -m "Configurar PostgreSQL para Vercel"
git push origin main
```

## 3️⃣ Configurar Variáveis de Ambiente

Vá em **Settings → Environment Variables** e adicione:

### Obrigatórias:
```
AUTH_SECRET = [gere com: openssl rand -base64 32]
AUTH_GITHUB_ID = [do seu GitHub OAuth App]
AUTH_GITHUB_SECRET = [do seu GitHub OAuth App]
DATABASE_URL = $POSTGRES_PRISMA_URL
```

### Opcionais (para análise com IA):
```
OPENAI_API_KEY = [sua key da OpenAI ou DeepSeek]
AI_PROVIDER = openai
```

### ⚠️ Importante sobre GitHub OAuth:
No seu GitHub OAuth App, você precisa atualizar as URLs:

1. Vá em GitHub → Settings → Developer settings → OAuth Apps
2. Edite sua aplicação
3. Atualize:
   - **Homepage URL**: `https://seu-app.vercel.app`
   - **Authorization callback URL**: `https://seu-app.vercel.app/api/auth/callback/github`

Se você usou `http://localhost:3300` antes, **crie uma NOVA OAuth App** para produção!

## 4️⃣ Executar Migrations no Vercel

Após configurar o banco, você precisa executar as migrations:

### Opção A: Via Vercel CLI (Recomendado)
```bash
# Instale a CLI
npm i -g vercel

# Faça login
vercel login

# Link o projeto
vercel link

# Puxe as variáveis de ambiente
vercel env pull .env.production

# Execute as migrations
npx prisma migrate deploy
```

### Opção B: Via Script Automático (Já configurado)
O `package.json` já está configurado com `prisma generate` no build, mas você pode adicionar:

```json
"scripts": {
  "build": "prisma migrate deploy && prisma generate && next build"
}
```

**⚠️ CUIDADO**: Isso vai rodar migrations automaticamente. Só use se tiver certeza!

## 5️⃣ Verificar Logs de Erro

Se ainda tiver problemas:

1. Vá no dashboard da Vercel
2. Clique no deployment mais recente
3. Verifique:
   - **Build Logs** - erros durante o build
   - **Function Logs** - erros em runtime

### Erros comuns nos logs:

#### "Prisma Client could not connect to database"
→ DATABASE_URL está incorreta ou banco não existe
→ Rode `prisma migrate deploy`

#### "Table does not exist"
→ Migrations não foram executadas
→ Rode `prisma migrate deploy`

#### "Invalid `prisma.xxx.findFirst()` invocation"
→ Prisma Client desatualizado
→ Verifique se `prisma generate` rodou no build

#### "Session undefined" ou "Not authorized"
→ AUTH_SECRET, AUTH_GITHUB_ID ou AUTH_GITHUB_SECRET faltando
→ GitHub OAuth callback URL incorreta

## 6️⃣ Testar o Deploy

Após configurar tudo:

1. Faça um novo deploy (push para main ou Redeploy na Vercel)
2. Aguarde o build completar
3. Abra a URL do projeto
4. Tente fazer login com GitHub
5. Verifique se os repositórios carregam

## 7️⃣ Debug Console do Browser

Se aparecer "Application error", abra o Console do navegador (F12):

### Chrome/Edge:
1. Pressione **F12**
2. Vá na aba **Console**
3. Recarregue a página
4. Copie os erros em vermelho

### Erros comuns no console:

#### "Failed to fetch"
→ Rota de API não está respondendo
→ Verifique Function Logs na Vercel

#### "Unauthorized"
→ Sessão expirou ou não configurada
→ Tente fazer logout e login novamente

#### "Network error"
→ Problema de CORS ou servidor não responde
→ Verifique se o deploy completou

## 🔄 Ordem Recomendada de Ações

1. ✅ Criar Vercel Postgres Storage
2. ✅ Configurar `DATABASE_URL = $POSTGRES_PRISMA_URL`
3. ✅ Adicionar todas as variáveis de ambiente
4. ✅ Atualizar GitHub OAuth App com URLs da Vercel
5. ✅ Mudar `prisma/schema.prisma` para PostgreSQL
6. ✅ Deletar `prisma/migrations` e recriar
7. ✅ Commit e push
8. ✅ Aguardar build
9. ✅ Executar `prisma migrate deploy` via Vercel CLI
10. ✅ Testar!

## 📞 Se nada funcionar

Compartilhe:
1. Screenshot dos **Function Logs** da Vercel
2. Erros do **Console do navegador** (F12)
3. Lista das **Environment Variables** configuradas (sem mostrar os valores!)

Isso vai ajudar a identificar o problema exato.
