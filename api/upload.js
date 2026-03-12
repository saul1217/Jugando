// ───────── API: /api/upload ─────────
// POST → Subir imagen a Vercel Blob
const { put } = require('@vercel/blob');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ error: 'Método no permitido' });
        }

        const contentType = req.headers['content-type'] || '';

        if (!contentType.startsWith('image/')) {
            return res.status(400).json({ error: 'Se requiere una imagen (content-type: image/*)' });
        }

        // Verificar tamaño (5MB máximo)
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'La imagen no puede pesar más de 5MB' });
        }

        // Generar nombre único para el archivo
        const ext = contentType.split('/')[1] || 'jpg';
        const filename = `posts/${crypto.randomUUID().slice(0, 12)}.${ext}`;

        // Subir a Vercel Blob
        const blob = await put(filename, req, {
            access: 'public',
            contentType: contentType,
        });

        return res.status(200).json({ url: blob.url });

    } catch (err) {
        console.error('API /api/upload error:', err);
        return res.status(500).json({
            error: 'Error al subir imagen',
            detail: err.message
        });
    }
};
