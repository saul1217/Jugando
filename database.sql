-- ==========================================================
-- 41 MECOS — Esquema PostgreSQL para Neon
-- Ejecutar en la consola SQL de Neon (https://console.neon.tech)
-- ==========================================================

-- ==========================================================
-- TABLA: posts
-- ==========================================================
CREATE TABLE IF NOT EXISTS posts (
    id          TEXT PRIMARY KEY,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);


-- ==========================================================
-- TABLA: comments
-- ==========================================================
CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(post_id, created_at ASC);
