// ───────── API: /api/comments ─────────
// POST → Crear un comentario en un post
const { getSQL } = require('../db');
const crypto = require('crypto');

function genId() {
    return crypto.randomUUID().slice(0, 8);
}

module.exports = async function handler(req, res) {
    const sql = getSQL();

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { post_id, content } = req.body;

        if (!post_id) {
            return res.status(400).json({ error: 'Se requiere post_id' });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        }

        if (content.length > 500) {
            return res.status(400).json({ error: 'Máximo 500 caracteres' });
        }

        // Verificar que el post existe
        const [post] = await sql`SELECT id FROM posts WHERE id = ${post_id}`;
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const id = genId();
        const trimmed = content.trim();

        await sql`
      INSERT INTO comments (id, post_id, content)
      VALUES (${id}, ${post_id}, ${trimmed})
    `;

        const [comment] = await sql`
      SELECT id, post_id, content, created_at
      FROM comments WHERE id = ${id}
    `;

        return res.status(201).json(comment);
    } catch (err) {
        console.error('POST /api/comments error:', err);
        return res.status(500).json({ error: 'Error al crear comentario' });
    }
};
