# Configuração do Vercel Blob Storage

O projeto usa **Vercel Blob Storage** para armazenar arquivos PDF dos currículos. Como a Vercel usa um sistema de arquivos **somente leitura**, não é possível salvar arquivos localmente em produção.

## 📝 Por que usar Blob Storage?

- ✅ Sistema de arquivos da Vercel é **read-only** em produção
- ✅ Blob Storage é **gratuito** até 5GB
- ✅ CDN global para download rápido
- ✅ Integração nativa com Vercel

## 🚀 Como Configurar

### 1️⃣ Acessar o Dashboard da Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **auto-portfolio-ai**

### 2️⃣ Criar Blob Storage

1. No menu lateral, clique em **Storage**
2. Clique em **Create Database** ou **Create Store**
3. Selecione **Blob**
4. Dê um nome: `resume-storage` (ou qualquer nome)
5. Clique em **Create**

### 3️⃣ Conectar ao Projeto

1. Após criar o Blob Store, clique em **Connect to Project**
2. Selecione seu projeto **auto-portfolio-ai**
3. Clique em **Connect**

### 4️⃣ Variável de Ambiente Automática

A Vercel vai criar automaticamente a variável:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXX
```

Essa variável será injetada automaticamente no projeto. **Não precisa copiar manualmente!**

### 5️⃣ Deploy

Faça um novo deploy (push para o GitHub) e pronto! 🎉

## 🔍 Verificar se está Funcionando

1. Acesse seu site na Vercel
2. Faça login
3. Tente fazer upload de um currículo
4. Se der erro, verifique os logs no Vercel Dashboard

## 📊 Monitorar Uso

- Dashboard Vercel > Storage > Blob
- Você verá:
  - Arquivos armazenados
  - Tamanho total usado
  - Limite gratuito: **5GB**

## ⚠️ Importante

- **Local Development**: Continue usando arquivos locais em `/public/uploads`
- **Produção (Vercel)**: Automaticamente usa Blob Storage
- O código detecta automaticamente o ambiente!

## 🆘 Troubleshooting

**Erro: "BLOB_READ_WRITE_TOKEN is not defined"**
- Solução: Verifique se conectou o Blob Store ao projeto
- Ou adicione manualmente em: Settings > Environment Variables

**Erro: "EROFS: read-only file system"**
- Solução: Significa que o Blob Storage ainda não está configurado
- Siga os passos acima para criar e conectar

## 📚 Documentação Oficial

https://vercel.com/docs/storage/vercel-blob
