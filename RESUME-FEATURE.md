# Guia de Implementação - Upload de Currículo

## ✅ O que foi implementado

### 1. Schema do Banco de Dados
Adicionado modelo `Resume` no Prisma:
- Armazena arquivo original (PDF/DOCX)
- Armazena versão aprimorada pela IA (quando aplicável)
- Flag `isEnhanced` para indicar se foi processado

### 2. APIs Criadas

#### `/api/resume/upload` (GET, POST, DELETE)
- **POST**: Upload de PDF ou DOCX (máx 10MB)
- **GET**: Buscar currículo do usuário logado
- **DELETE**: Remover currículo

#### `/api/resume/enhance` (POST)
- Analisa projetos do GitHub com IA
- Gera sugestões para o currículo
- Para PDFs: integra com PDFDancer API (requer chave)
- Para DOCX: retorna sugestões para aplicação manual

### 3. Componentes

#### `ResumeUpload`
- Upload de arquivo (drag & drop visual)
- Botão para aprimorar com IA
- Opção de baixar/visualizar
- Input para chave da API PDFDancer (quando necessário)

### 4. Páginas

#### `/portfolio/[username]/resume`
- Exibe o currículo em página inteira
- PDFs renderizados em iframe
- DOCX oferece download
- Botão para download do arquivo

## 📋 Próximos passos necessários

### 1. Executar migração do banco ✅
```bash
npx prisma migrate dev --name add_resume_model
```
**Status**: Concluído!

### 2. Instalar dependências ✅
```bash
npm install
```
**Status**: Concluído!

### 3. Criar diretório de uploads ✅
```bash
mkdir -p public/uploads/resumes
```
**Status**: Concluído!

### 4. Configurar variáveis de ambiente ✅
Adicione ao `.env`:
```env
PDFDANCER_API_KEY="sua_chave_aqui"
NEXT_PUBLIC_APP_URL="http://localhost:3300"
```
**Status**: Já configurado com sua chave!

### 5. Implementar integração real com PDFDancer (Opcional)
A função `enhanceResumeWithPDFDancer` em `/api/resume/enhance/route.ts` tem uma estrutura básica. Você precisará:
- Consultar a documentação real da API: https://docs.pdfdancer.com/
- Ajustar os endpoints e parâmetros conforme a API real
- Implementar a lógica de modificação do PDF

## 🎯 Como usar

### No Dashboard:
1. Usuário faz upload do currículo (PDF ou DOCX)
2. Escolhe entre:
   - **Salvar direto** (sem modificações) - clica em "Aprimorar com IA" apenas quando quiser
   - **Aprimorar com IA** - analisa projetos GitHub automaticamente

### Para PDF + IA:
- **Não precisa de chave** - usa a configurada no servidor (`.env`)
- IA analisa projetos e adiciona informações relevantes ao PDF
- PDF modificado é salvo automaticamente

### Para DOCX + IA:
- IA analisa projetos
- Retorna sugestões (habilidades, experiência, destaques)
- Usuário aplica manualmente no documento

### No Portfólio Público:
- Botão "Ver Currículo" aparece se o usuário tiver currículo
- Página dedicada para visualização
- PDF é exibido em iframe
- DOCX oferece download

## 🔧 Pontos de atenção

1. **PDFDancer API**: A integração está estruturada mas precisa dos endpoints reais
2. **Segurança**: Arquivos são salvos em `public/uploads/resumes` - considere usar storage em nuvem (S3, etc) para produção
3. **Validação**: Apenas PDF e DOCX são aceitos, máximo 10MB
4. **Performance**: Para muitos usuários, considere processamento em background

## 📝 Estrutura de arquivos criados

```
src/
├── app/
│   ├── api/
│   │   └── resume/
│   │       ├── upload/route.ts       # Upload, buscar e deletar
│   │       └── enhance/route.ts      # Processar com IA
│   └── portfolio/
│       └── [username]/
│           └── resume/
│               └── page.tsx          # Página de exibição
├── components/
│   ├── resume-upload.tsx             # Componente de upload
│   └── portfolio-preview.tsx         # Atualizado com link
└── prisma/
    └── schema.prisma                 # Schema atualizado
```

## 🚀 Features implementadas

✅ Upload de PDF e DOCX
✅ Validação de tipo e tamanho
✅ Salvar sem modificações
✅ Processar com IA (estrutura pronta)
✅ Análise de projetos GitHub
✅ Sugestões objetivas (sem exageros)
✅ Exibição em página inteira no portfólio
✅ Download do currículo
✅ Visualização de PDF inline
✅ Substituição de arquivo
✅ Exclusão de currículo
