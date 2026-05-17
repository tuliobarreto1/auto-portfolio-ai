-- ============================================================
-- AutoPortfolio AI - schema inicial no InfraForge
-- ============================================================
-- auth.users e gerenciada pelo InfraForge. Aqui criamos apenas
-- as tabelas da aplicacao no schema public, referenciando
-- auth.users(id) (UUID). RLS habilitada em todas.
--
-- Aplicar via:  infraforge sql -f infraforge/migrations/0001_init.sql
-- ============================================================

-- ---------- helper: updated_at automatico ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- profiles  (dados publicos de identidade do app)
--   id = auth.users.id (UUID da identidade InfraForge).
--   github_id / username sao preenchidos quando o usuario conecta
--   a conta do GitHub dentro do app (ficam NULL ate la).
--   NAO guarda segredos: leitura publica para o portfolio.
-- ============================================================
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text,                         -- email da identidade InfraForge
  github_id    text UNIQUE,                  -- id numerico do GitHub (ao conectar)
  username     text UNIQUE,                  -- login do GitHub / slug do portfolio
  display_name text,                         -- nome editavel exibido no portfolio
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- qualquer um pode ler um profile (a pagina /portfolio/[username] e publica)
CREATE POLICY profiles_public_select ON public.profiles
  FOR SELECT USING (true);

-- o dono cria o proprio profile (no provisionamento pos-login)
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- o dono atualiza apenas o proprio profile
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- github_credentials  (token OAuth do GitHub, escopo repo)
--   tabela SEPARADA de profiles de proposito: RLS e por LINHA,
--   nao por coluna. Se o token estivesse em profiles (publica),
--   vazaria. Aqui: somente o dono le/escreve. Token criptografado
--   pela aplicacao antes de gravar (AES, TOKEN_ENCRYPTION_KEY).
-- ============================================================
CREATE TABLE public.github_credentials (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,                -- criptografado pela app
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.github_credentials ENABLE ROW LEVEL SECURITY;

-- sem policy publica: ninguem alem do dono acessa
CREATE POLICY ghcred_select_own ON public.github_credentials
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ghcred_insert_own ON public.github_credentials
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY ghcred_update_own ON public.github_credentials
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER ghcred_set_updated_at
  BEFORE UPDATE ON public.github_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- repositories  (substitui o model Repository)
--   chave natural = (dono, id do repo no GitHub).
-- ============================================================
CREATE TABLE public.repositories (
  owner_id         uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repo_id   bigint NOT NULL,
  name             text   NOT NULL,
  full_name        text   NOT NULL,
  description      text,
  html_url         text   NOT NULL,
  language         text,
  stargazers_count integer NOT NULL DEFAULT 0,
  repo_updated_at  timestamptz,               -- updated_at vindo do GitHub
  private          boolean NOT NULL DEFAULT false,
  selected         boolean NOT NULL DEFAULT false,
  PRIMARY KEY (owner_id, github_repo_id)
);

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

-- o dono enxerga e gerencia todos os seus repos
CREATE POLICY repo_owner_all ON public.repositories
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- o publico ve apenas os repos marcados como selecionados (portfolio)
CREATE POLICY repo_public_select ON public.repositories
  FOR SELECT USING (selected = true);

-- ============================================================
-- portfolio_items  (substitui o model PortfolioItem)
-- ============================================================
CREATE TABLE public.portfolio_items (
  owner_id          uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repo_id    bigint NOT NULL,
  objective         text,
  features          text,
  technical_summary text,
  demo_url          text,
  recording_url     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, github_repo_id),
  FOREIGN KEY (owner_id, github_repo_id)
    REFERENCES public.repositories(owner_id, github_repo_id) ON DELETE CASCADE
);

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- o dono gerencia os proprios itens
CREATE POLICY pitem_owner_all ON public.portfolio_items
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- o publico ve itens apenas de repos selecionados
CREATE POLICY pitem_public_select ON public.portfolio_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.owner_id = portfolio_items.owner_id
        AND r.github_repo_id = portfolio_items.github_repo_id
        AND r.selected = true
    )
  );

CREATE TRIGGER pitem_set_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- resumes  (substitui o model Resume) - 1 por usuario
-- ============================================================
CREATE TABLE public.resumes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  original_file_name text NOT NULL,
  file_name          text NOT NULL DEFAULT 'resume.pdf',
  file_type          text NOT NULL,
  file_url           text NOT NULL,
  enhanced_file_url  text,
  is_enhanced        boolean NOT NULL DEFAULT false,
  template_type      text NOT NULL DEFAULT 'classic',
  structured_data    jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- o dono gerencia o proprio curriculo
CREATE POLICY resume_owner_all ON public.resumes
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- o curriculo e exibido publicamente em /portfolio/[username]/resume
CREATE POLICY resume_public_select ON public.resumes
  FOR SELECT USING (true);

CREATE TRIGGER resume_set_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- indices auxiliares ----------
CREATE INDEX repositories_selected_idx ON public.repositories (owner_id, selected);
