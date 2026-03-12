// ───────── API: /api/username ─────────
// GET  ?token=xxx → Obtener nombre actual
// POST → Reclamar o cambiar nombre
const { getSQL } = require('../db');

module.exports = async function handler(req, res) {
    try {
        const sql = getSQL();

        // ──── GET /api/username?token=xxx ────
        if (req.method === 'GET') {
            const { token } = req.query || {};

            if (!token) {
                return res.status(400).json({ error: 'Se requiere token' });
            }

            const [user] = await sql`
                SELECT name FROM usernames WHERE token = ${token}
            `;

            if (!user) {
                return res.status(404).json({ error: 'Token no encontrado' });
            }

            return res.status(200).json({ name: user.name });
        }

        // ──── POST /api/username ────
        if (req.method === 'POST') {
            const { token, name } = req.body || {};

            if (!token || !name) {
                return res.status(400).json({ error: 'Se requiere token y name' });
            }

            const trimmedName = name.trim();

            // Validar formato: sin espacios, 2-20 chars, alfanumérico + guiones/underscores
            if (trimmedName.length < 2 || trimmedName.length > 20) {
                return res.status(400).json({ error: 'El nombre debe tener entre 2 y 20 caracteres' });
            }

            if (/\s/.test(trimmedName)) {
                return res.status(400).json({ error: 'El nombre no puede contener espacios' });
            }

            if (!/^[a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ]+$/.test(trimmedName)) {
                return res.status(400).json({ error: 'Solo se permiten letras, números, guiones y guiones bajos' });
            }

            // Verificar si el nombre ya está tomado por otro usuario
            const [existing] = await sql`
                SELECT token FROM usernames WHERE name = ${trimmedName}
            `;

            if (existing && existing.token !== token) {
                return res.status(409).json({ error: 'Ese nombre ya está en uso. Elige otro.' });
            }

            // Si el token ya existe → actualizar nombre
            const [currentUser] = await sql`
                SELECT token FROM usernames WHERE token = ${token}
            `;

            if (currentUser) {
                await sql`
                    UPDATE usernames SET name = ${trimmedName} WHERE token = ${token}
                `;
            } else {
                await sql`
                    INSERT INTO usernames (token, name) VALUES (${token}, ${trimmedName})
                `;
            }

            return res.status(200).json({ name: trimmedName });
        }

        // Método no soportado
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Método no permitido' });

    } catch (err) {
        console.error('API /api/username error:', err);

        // Manejar error de unicidad de PostgreSQL
        if (err.message && err.message.includes('unique')) {
            return res.status(409).json({ error: 'Ese nombre ya está en uso. Elige otro.' });
        }

        return res.status(500).json({
            error: 'Error del servidor',
            detail: err.message
        });
    }
};
