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
            return res.status(400).json({ error: 'El campo nombre es requerido.' });
        }

        const { rows } = await db.queryWithAudit(
            'INSERT INTO tecnologias (nombre) VALUES ($1) RETURNING *',
            [nombre],
            req
        );

        cache.tecnologias = null; // Invalidar el caché

        res.status(201).json({ message: 'Tecnologia creada exitosamente', data: rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Error de unicidad
            return res.status(400).json({ error: `La tecnología '${req.body.nombre}' ya existe.` });
        }
        res.status(500).json({ error: error.message });
    }
};

// =============================================================================
// ¡NUEVAS FUNCIONES AÑADIDAS!
// =============================================================================

/*Actualiza el nombre de una tecnología existente.*/
const actualizarTecnologia = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const usuarioId = req.usuario.id; // Asumimos que solo un admin puede editar

        if (!nombre) {
            return res.status(400).json({ error: 'El campo nombre es requerido.' });
        }

        const { rows, rowCount } = await db.queryWithAudit(
            'UPDATE tecnologias SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id],
            req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Tecnología no encontrada.' });
        }
        
        cache.tecnologias = null; // Invalidar el caché

        res.json({ message: 'Tecnología actualizada exitosamente', data: rows[0] });

    } catch (error) {
        if (error.code === '23505') { // Error de unicidad
            return res.status(400).json({ error: `El nombre '${req.body.nombre}' ya existe.` });
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * Elimina una tecnología.
 * Fallará si la tecnología está siendo usada por algún proyecto.
 */
const eliminarTecnologia = async (req, res) => {
    try {
        const { id } = req.params;

        const { rowCount } = await db.queryWithAudit(
            'DELETE FROM tecnologias WHERE id = $1',
            [id],
            req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Tecnología no encontrada.' });
        }

        cache.tecnologias = null; // Invalidar el caché

        res.json({ message: 'Tecnología eliminada exitosamente' });

    } catch (error) {
        // Error de violación de FOREIGN KEY
        if (error.code === '23503') { 
            return res.status(400).json({ error: 'No se puede eliminar la tecnología porque está siendo usada por uno o más proyectos.' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerTecnologias,
    crearTecnologia,
    actualizarTecnologia, 
    eliminarTecnologia  
};