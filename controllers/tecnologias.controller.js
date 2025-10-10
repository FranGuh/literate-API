// controllers/tecnologias.controller.js
const db = require('../config/db');

let cache = {
    tecnologias: null,
    timestamp: null
};

const OBTENER_TECNOLOGIAS_QUERY = 'SELECT * FROM tecnologias ORDER BY id DESC';

const obtenerTecnologias = async (req, res) => {
    try {
        if (cache.tecnologias) {
            return res.json(cache.tecnologias);
        }

        const { rows } = await db.query(OBTENER_TECNOLOGIAS_QUERY);

        cache.tecnologias = rows;

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearTecnologia = async (req, res) => {
    try {
        const { nombre } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: 'El campo nombre es requerido.'});
        }
        const { rows } = await db.queryWithAudit(
            'INSERT INTO tecnologias (nombre) VALUES ($1) RETURNING *',
            [nombre],
            req
        );

        cache.tecnologias = null;

        res.status(201).json({ message: 'Tecnologia creada existosamente', data: rows[0] });
    } catch (error) {
        if (error.code === '23505'){
            return res.status(400).json({ error: `La tecnología '${req.body.nombre}' ya existe.`});
        }
        res.status(500).json({ error: error.message })
    }
}

module.exports = {
    obtenerTecnologias,
    crearTecnologia,
}