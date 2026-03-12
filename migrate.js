// Quick migration script — run once to create/update tables in Neon
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrate() {
    const sql = neon(process.env.DATABASE_URL);

    // ── Tabla usernames ──
    await sql`CREATE TABLE IF NOT EXISTS usernames (
        token       TEXT PRIMARY KEY,
        name        TEXT UNIQUE NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_usernames_name ON usernames(name)`;

    // ── Tabla posts ──
    await sql`CREATE TABLE IF NOT EXISTS posts (
        id          TEXT PRIMARY KEY,
        content     TEXT NOT NULL,
        author_name TEXT,
        image_url   TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`;

    // Agregar columnas si no existen (para migración de BD existente)
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name TEXT`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT`;

    // ── Tabla comments ──
    await sql`CREATE TABLE IF NOT EXISTS comments (
        id          TEXT PRIMARY KEY,
        post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        content     TEXT NOT NULL,
        author_name TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
    )`;

    await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(post_id, created_at ASC)`;

    // Agregar columna si no existe
    await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name TEXT`;

    console.log('✅ Tablas creadas/actualizadas exitosamente en Neon!');
}

migrate().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
