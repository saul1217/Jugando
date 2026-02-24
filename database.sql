-- ==========================================================
-- 41 MECOS — Esquema de Base de Datos
-- Compatible con SQLite / MySQL / PostgreSQL
-- ==========================================================

-- ==========================================================
-- TABLA: posts
-- Almacena las publicaciones anónimas del foro.
-- ==========================================================
CREATE TABLE IF NOT EXISTS posts (
    id          TEXT PRIMARY KEY,          -- UUID generado (ej: 'a1b2c3d4')
    content     TEXT NOT NULL,             -- Texto de la publicación (máx ~1000 chars)
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para ordenar el feed por fecha (más reciente primero)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);


-- ==========================================================
-- TABLA: comments
-- Almacena los comentarios asociados a cada publicación.
-- ==========================================================
CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,          -- UUID generado
    post_id     TEXT NOT NULL,             -- FK → posts.id
    content     TEXT NOT NULL,             -- Texto del comentario (máx ~500 chars)
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Índice para obtener los comentarios de un post rápidamente
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Índice para ordenar comentarios por fecha dentro de un post
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(post_id, created_at ASC);


-- ==========================================================
-- QUERIES DE EJEMPLO
-- ==========================================================

-- 1. Obtener todas las publicaciones (feed), más recientes primero:
-- SELECT * FROM posts ORDER BY created_at DESC;

-- 2. Crear una nueva publicación:
-- INSERT INTO posts (id, content) VALUES ('a1b2c3d4', '¡Hola mundo anónimo!');

-- 3. Obtener los comentarios de un post:
-- SELECT * FROM comments WHERE post_id = 'a1b2c3d4' ORDER BY created_at ASC;

-- 4. Agregar un comentario a un post:
-- INSERT INTO comments (id, post_id, content) VALUES ('e5f6g7h8', 'a1b2c3d4', 'Gran publicación');

-- 5. Eliminar un post y sus comentarios (CASCADE):
-- DELETE FROM posts WHERE id = 'a1b2c3d4';
