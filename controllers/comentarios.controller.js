const db = require('../config/db');

// Esta consulta obtiene los comentarios de un proyecto,
// y anida el autor (usuario) y el recuento de "likes"
const OBTENER_COMENTARIOS_QUERY = `
    WITH 
        comentarios_base AS (
            SELECT 
                pc.id,
                pc.mensaje,
                pc.parent_id,
                pc.created_at,
                json_build_object(
                    'id', u.id,
                    'nombre', u.nombre
                ) AS usuario
            FROM 
                proyectos_comentarios pc
            LEFT JOIN 
                usuarios u ON u.id = pc.usuario_id
            WHERE 
                pc.proyecto_id = $1
        ),
        
        likes_count AS (
            SELECT 
                comentario_id,
                count(*) AS total_likes
            FROM 
                comentario_likes
            GROUP BY 
                comentario_id
        )
    SELECT 
        cb.*,
        COALESCE(lc.total_likes, 0)::int AS likes_count
    FROM 
        comentarios_base cb
    LEFT JOIN 
        likes_count lc ON lc.comentario_id = cb.id
    ORDER BY 
        cb.created_at ASC
`;


const obtenerComentariosPorProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        
        // --- PAGINACIÓN AÑADIDA ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15; // Un límite por defecto de 15 comentarios
        const offset = (page - 1) * limit;

        // Modificamos la consulta para incluir paginación
        const paginatedQuery = OBTENER_COMENTARIOS_QUERY + ` LIMIT $2 OFFSET $3`;

        const { rows } = await db.query(paginatedQuery, [id, limit, offset]);
        
        // También obtenemos el conteo total de comentarios para ese proyecto
        const totalResult = await db.query('SELECT COUNT(*) FROM proyectos_comentarios WHERE proyecto_id = $1', [id]);
        const totalComentarios = parseInt(totalResult.rows[0].count, 10);
        const totalPaginas = Math.ceil(totalComentarios / limit);

        res.json({
            data: rows,
            pagina: page,
            totalPaginas: totalPaginas,
            totalComentarios: totalComentarios
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearComentario = async (req, res) => {
    try {
        // --- MODIFICACIÓN: Obtenemos el proyectoId del body ---
        // Esto es más flexible que obtenerlo de la URL, 
        // especialmente para un endpoint genérico /api/comentarios
        const { proyectoId, mensaje, parentId = null } = req.body;
        const usuarioId = req.usuario.id;

        if (!proyectoId || !mensaje) {
            return res.status(400).json({ error: 'Proyecto ID y mensaje son requeridos.' });
        }

        const { rows } = await db.queryWithAudit(
            'INSERT INTO proyectos_comentarios (proyecto_id, usuario_id, mensaje, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [proyectoId, usuarioId, mensaje, parentId],
            req
        );

        res.status(201).json({ message: 'Comentario creado exitosamente', data: rows[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const actualizarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { mensaje } = req.body;
        const usuarioId = req.usuario.id;

        if (!mensaje) {
            return res.status(400).json({ error: 'El mensaje es requerido.' });
        }

        const { rows, rowCount } = await db.queryWithAudit(
            'UPDATE proyectos_comentarios SET mensaje = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *',
            [mensaje, id, usuarioId],
            req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado o no tienes permiso para editarlo.' });
        }

        res.json({ message: 'Comentario actualizado exitosamente', data: rows[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const { rowCount } = await db.queryWithAudit(
            'DELETE FROM proyectos_comentarios WHERE id = $1 AND usuario_id = $2',
            [id, usuarioId],
            req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado o no tienes permiso para eliminarlo.' });
        }

        res.json({ message: 'Comentario eliminado exitosamente' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleLikeAComentario = async (req, res) => {
    try {
        const { id } = req.params; // ID del comentario
        const usuarioId = req.usuario.id;

        const { rowCount } = await db.queryWithAudit(
            'DELETE FROM comentario_likes WHERE comentario_id = $1 AND usuario_id = $2',
            [id, usuarioId],
            req
        );

        if (rowCount > 0) {
            return res.status(200).json({ message: 'Like quitado del comentario' });
        }

        await db.queryWithAudit(
            `INSERT INTO comentario_likes (comentario_id, usuario_id) 
             VALUES ($1, $2)
             ON CONFLICT (comentario_id, usuario_id) DO NOTHING`,
            [id, usuarioId],
            req
        );

        res.status(201).json({ message: 'Like añadido al comentario' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerComentariosPorProyecto,
    crearComentario,
    actualizarComentario,
    eliminarComentario,
    toggleLikeAComentario
};