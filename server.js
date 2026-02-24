/* ==========================================================
   41 MECOS — Backend Mínimo
   Express + better-sqlite3
   ========================================================== 

   INSTRUCCIONES DE INSTALACIÓN:
   1. npm init -y
   2. npm install express better-sqlite3 cors
   3. node server.js
   4. Abrir http://localhost:3000
   ========================================================== */

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ───────── Middleware ─────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Sirve index.html, style.css, app.js

// ───────── Base de Datos ─────────
const db = new Database(path.join(__dirname, '41mecos.db'));

// Habilitar WAL para mejor performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          TEXT PRIMARY KEY,
    content     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    post_id     TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(post_id, created_at ASC);
`);

// ───────── Prepared Statements ─────────
const stmts = {
    getAllPosts: db.prepare('SELECT * FROM posts ORDER BY created_at DESC'),
    getComments: db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC'),
    insertPost: db.prepare('INSERT INTO posts (id, content) VALUES (?, ?)'),
    insertComment: db.prepare('INSERT INTO comments (id, post_id, content) VALUES (?, ?, ?)'),
    getPost: db.prepare('SELECT * FROM posts WHERE id = ?'),
};

function genId() {
    return crypto.randomUUID().slice(0, 8);
}

// ───────── API Endpoints ─────────

// GET /api/posts — Obtener todas las publicaciones con sus comentarios
app.get('/api/posts', (req, res) => {
    try {
        const posts = stmts.getAllPosts.all();
        const result = posts.map(post => ({
            ...post,
            comments: stmts.getComments.all(post.id)
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
});

// POST /api/posts — Crear una nueva publicación
app.post('/api/posts', (req, res) => {
    try {
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'El contenido no puede estar vacío' });
        }

        if (content.length > 1000) {
            return res.status(400).json({ error: 'Máximo 1000 caracteres' });
        }

        const id = genId();
        stmts.insertPost.run(id, content.trim());

        const post = stmts.getPost.get(id);
        post.comments = [];

        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear publicación' });
    }
});

// POST /api/posts/:id/comments — Agregar un comentario a un post
app.post('/api/posts/:id/comments', (req, res) => {
    try {
        const { id: postId } = req.params;
        const { content } = req.body;

        // Verificar que el post existe
        const post = stmts.getPost.get(postId);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        }

        if (content.length > 500) {
            return res.status(400).json({ error: 'Máximo 500 caracteres' });
        }

        const commentId = genId();
        stmts.insertComment.run(commentId, postId, content.trim());

        const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear comentario' });
    }
});

// ───────── Start Server ─────────
app.listen(PORT, () => {
    console.log(`\n🔥 41 mecos corriendo en http://localhost:${PORT}\n`);
});
