-- ============================================================
--  LOJA DE CASTRO — SMS BOT · Esquema Supabase
--  Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. CONTATOS — lista de destinatários dos SMS
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,   -- formato: +5521999990001
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','opted_out','invalid')),
  source      TEXT,                   -- ex: 'site', 'evento', 'manual'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIAS — tipos de conteúdo do site
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,   -- ex: 'livro', 'mentoria', 'evento'
  label       TEXT NOT NULL,          -- ex: 'Livro', 'Mentoria'
  emoji       TEXT,                   -- ex: '📚'
  active      BOOLEAN DEFAULT TRUE
);

-- Categorias iniciais baseadas no site lojasdecastro.com.br
INSERT INTO categories (slug, label, emoji) VALUES
  ('livro',       'Livro',            '📚'),
  ('mentoria',    'Mentoria',         '🎯'),
  ('membros',     'Área de Membros',  '👥'),
  ('evento',      'Evento Gratuito',  '🎉'),
  ('artigo',      'Artigo',           '📝'),
  ('curso',       'Curso',            '🎓');

-- 3. POSTS GERADOS — histórico de todos os posts criados pela IA
CREATE TABLE generated_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   INT REFERENCES categories(id),
  source_url    TEXT,                 -- URL da página do site usada como base
  source_title  TEXT,                 -- título do item (nome do livro, evento etc.)
  content       TEXT NOT NULL,        -- texto do SMS gerado
  char_count    INT GENERATED ALWAYS AS (char_length(content)) STORED,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','archived')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENVIOS — log de cada SMS disparado
CREATE TABLE sms_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID REFERENCES generated_posts(id),
  contact_id      UUID REFERENCES contacts(id),
  phone           TEXT NOT NULL,
  provider        TEXT,               -- 'twilio' | 'zapi' | 'infobip'
  provider_msg_id TEXT,               -- ID retornado pelo provedor
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CAMPANHAS — agrupamento de um post + seus envios
CREATE TABLE campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID REFERENCES generated_posts(id),
  total_sent  INT DEFAULT 0,
  total_ok    INT DEFAULT 0,
  total_fail  INT DEFAULT 0,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- ── Índices para performance ──────────────────────────────────
CREATE INDEX idx_contacts_status  ON contacts(status);
CREATE INDEX idx_sends_post       ON sms_sends(post_id);
CREATE INDEX idx_sends_contact    ON sms_sends(contact_id);
CREATE INDEX idx_posts_category   ON generated_posts(category_id);
CREATE INDEX idx_posts_status     ON generated_posts(status);

-- ── Trigger: atualiza updated_at em contacts automaticamente ──
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_updated
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── View útil: último post enviado por categoria ─────────────
CREATE VIEW last_sent_per_category AS
SELECT DISTINCT ON (c.slug)
  c.slug,
  c.label,
  c.emoji,
  gp.source_title,
  gp.content,
  gp.created_at
FROM categories c
LEFT JOIN generated_posts gp ON gp.category_id = c.id AND gp.status = 'sent'
ORDER BY c.slug, gp.created_at DESC;

-- ── Row Level Security (RLS) — habilite se usar auth Supabase ─
-- ALTER TABLE contacts       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_sends      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns      ENABLE ROW LEVEL SECURITY;
