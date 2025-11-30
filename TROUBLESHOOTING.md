# Troubleshooting - Erro na Vercel

## ❌ Erro Atual: "Application error: a client-side exception has occurred"

Este erro acontece quando algo falha no lado do cliente (navegador). Vamos resolver passo a passo.

## 🔍 PASSO 1: Verifique o Console do Navegador

1. Abra seu site na Vercel
2. Pressione **F12** (ou clique direito → Inspecionar)
3. Vá na aba **Console**
4. Recarregue a página (**F5**)
5. **Copie TODOS os erros em vermelho** e me envie

## 🔍 PASSO 2: Verifique os Function Logs da Vercel

1. Acesse o dashboard da Vercel
2. Clique no seu projeto
3. Vá em **Deployments**
4. Clique no deployment mais recente
5. Clique em **Functions**
6. Procure por erros (linhas em vermelho)
7. **Tire um screenshot** e me envie

## ⚙️ PASSO 3: Verificar Variáveis de Ambiente

Na Vercel, vá em **Settings → Environment Variables** e confirme que você tem:

### Obrigatórias para funcionar:
- [ ] `AUTH_SECRET` (gere com: `openssl rand -base64 32`)
- [ ] `AUTH_GITHUB_ID` (do seu GitHub OAuth App)
- [ ] `AUTH_GITHUB_SECRET` (do seu GitHub OAuth App)
- [ ] `DATABASE_URL` (deve ser: `$POSTGRES_PRISMA_URL`)

### Obrigatórias para análise de IA funcionar:
- [ ] `OPENAI_API_KEY` (sua key da OpenAI ou DeepSeek)
- [ ] `AI_PROVIDER` (valor: `openai` ou `deepseek`)

### ⚠️ MUITO IMPORTANTE - GitHub OAuth URLs

No seu GitHub OAuth App (https://github.com/settings/developers):

1. Crie um **NOVO OAuth App** para produção (não use o de localhost!)
2. Configure:
   ```
   Application name: AutoPortfolio Production
   Homepage URL: https://SEU-APP.vercel.app
   Authorization callback URL: https://SEU-APP.vercel.app/api/auth/callback/github
   ```
3. Copie o **Client ID** e **Client Secret**
4. Cole na Vercel como `AUTH_GITHUB_ID` e `AUTH_GITHUB_SECRET`

## 🗄️ PASSO 4: Verificar Banco de Dados

### A. Criar Vercel Postgres (se ainda não criou):

1. No dashboard da Vercel, vá em **Storage**
2. Clique em **Create Database**
3. Escolha **Postgres**
4. Clique em **Create**

### B. Configurar DATABASE_URL:

A Vercel cria automaticamente `POSTGRES_PRISMA_URL`. Você precisa fazer:

1. Vá em **Settings → Environment Variables**
2. Procure por `DATABASE_URL`
3. Se não existir, clique em **Add New**
4. Configure:
   ```
   Key: DATABASE_URL
   Value: $POSTGRES_PRISMA_URL
   ```
5. Salve

### C. Executar Migrations:

```bash
# Instale a Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Link o projeto
vercel link

# Puxe as env vars
vercel env pull

# Execute as migrations
npx prisma migrate deploy
```

## 🐛 PASSO 5: Erros Comuns e Soluções

### Erro: "Prisma Client could not connect"
**Solução**: `DATABASE_URL` está errada ou banco não existe
```bash
# Verifique se o Vercel Postgres foi criado
# Execute: npx prisma migrate deploy
```

### Erro: "Table 'User' does not exist"
**Solução**: Migrations não foram executadas
```bash
npx prisma migrate deploy
```

### Erro: "Invalid session" ou "Unauthorized"
**Solução**:
1. Verifique se `AUTH_SECRET`, `AUTH_GITHUB_ID` e `AUTH_GITHUB_SECRET` estão configurados
2. Verifique se o callback URL do GitHub OAuth está correto
3. Tente criar um novo OAuth App para produção

### Erro: "Failed to fetch" no console
**Solução**: Problema com rotas de API
1. Verifique os Function Logs
2. Pode ser erro de conexão com banco de dados

### Erro: Deploy com "Build failed"
**Solução**: Veja os Build Logs
```bash
# Provavelmente precisa mudar o schema para PostgreSQL
# Edite prisma/schema.prisma:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# Delete e recrie migrations:
rm -rf prisma/migrations
npx prisma migrate dev --name init

# Commit e push:
git add .
git commit -m "Fix schema for PostgreSQL"
git push origin main
```

## 📋 Checklist Rápido

Antes de pedir ajuda, confirme que fez TODOS estes passos:

- [ ] Criei Vercel Postgres Storage
- [ ] Configurei `DATABASE_URL = $POSTGRES_PRISMA_URL`
- [ ] Adicionei todas as variáveis de ambiente (AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET)
- [ ] Criei um OAuth App NOVO para produção no GitHub
- [ ] Configurei os callbacks do OAuth com a URL da Vercel
- [ ] Mudei o `prisma/schema.prisma` para `provider = "postgresql"`
- [ ] Deletei `prisma/migrations` e recriei
- [ ] Fiz commit e push das mudanças
- [ ] Executei `npx prisma migrate deploy`
- [ ] Aguardei o build completar na Vercel
- [ ] Testei fazer login

## 🆘 Ainda com problema?

Me envie:

1. **Screenshot dos erros do Console do navegador (F12)**
2. **Screenshot dos Function Logs da Vercel**
3. **Lista das Environment Variables** que você configurou (só os nomes, não os valores!)
4. **URL do callback configurado no GitHub OAuth App**

Com essas informações consigo te ajudar melhor!

## 💡 Dica Rápida

Se nada funcionar, tente:

1. Fazer um **Redeploy** na Vercel (botão "Redeploy" no dashboard)
2. Limpar o cache do navegador
3. Testar em uma aba anônima
4. Verificar se a URL do GitHub OAuth está EXATAMENTE igual à da Vercel (sem / no final!)
