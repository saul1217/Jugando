// ───────── Neon Database Connection ─────────
// Módulo compartido para las serverless functions de Vercel
const { neon } = require('@neondatabase/serverless');

function getSQL() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL no está configurada. Agrégala en Vercel → Settings → Environment Variables.');
    }
    return neon(process.env.DATABASE_URL);
}

module.exports = { getSQL };
