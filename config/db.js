// config/db.js
const { Pool, Query } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized:false
    }
});

const simpleQuery = (text, params) => pool.query(text, params);

const queryWithAudit = async (text, params, req) => {
    const client = await pool.connect();
    try {
        const userId = req.usuario ? req.usuario.id : null;
        const ipAddress = req.ip;

        await client.query("SELECT set_config('audit.user_id', $1, false)", [userId]);
        await client.query("SELECT set_config('audit.ip_address', $1, false)", [ipAddress]);
        
        const res = await client.query(text, params);
        return res;
    } finally {
        client.release();
    }
};

module.exports = {
    query: simpleQuery,
    queryWithAudit: queryWithAudit,
    pool: pool,
};