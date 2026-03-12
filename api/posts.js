// ───────── API: /api/posts ─────────
// GET  → Obtener todas las publicaciones con comentarios
// POST → Crear nueva publicación
const { getSQL } = require('../db');
const crypto = require('crypto');

function genId() {
    return crypto.randomUUID().slice(0, 8);
}

module.exports = async function handler(req, res) {
    try {
        const sql = getSQL();

        // ──── GET /api/posts ────
        if (req.method === 'GET') {
            const posts = await sql`
                SELECT id, content, author_name, image_url, created_at
                FROM posts
                ORDER BY created_at DESC
            `;

            // Obtener comentarios para cada post
            const result = [];
            for (const post of posts) {
                const comments = await sql`
                    SELECT id, content, author_name, created_at
                    FROM comments
                    WHERE post_id = ${post.id}
                    ORDER BY created_at ASC
                `;
                result.push({ ...post, comments });
            }

            return res.status(200).json(result);
        }

        // ──── POST /api/posts ────
        if (req.method === 'POST') {
            const { content, author_name, image_url } = req.body || {};

            if (!content || !content.trim()) {
                return res.status(400).json({ error: 'El contenido no puede estar vacío' });
            }

            if (content.length > 1000) {
                return res.status(400).json({ error: 'Máximo 1000 caracteres' });
            }

            // Validar tamaño del base64 (aprox 2MB max en texto)
            if (image_url && image_url.length > 2 * 1024 * 1024) {
                return res.status(400).json({ error: 'La imagen es demasiado grande' });
            }

            const id = genId();
            const trimmed = content.trim();
            const authorName = author_name ? author_name.trim() : null;
            const imgUrl = image_url || null;

            await sql`
                INSERT INTO posts (id, content, author_name, image_url)
                VALUES (${id}, ${trimmed}, ${authorName}, ${imgUrl})
            `;

            const [post] = await sql`
                SELECT id, content, author_name, image_url, created_at
                FROM posts WHERE id = ${id}
            `;

            post.comments = [];
            return res.status(201).json(post);
        }

        // Método no soportado
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Método no permitido' });

    } catch (err) {
        console.error('API /api/posts error:', err);
        return res.status(500).json({
            error: 'Error del servidor',
            detail: err.message
        });
    }
};
