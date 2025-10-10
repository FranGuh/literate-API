// controllers/proyectos.controller.js
const db = require('../config/db');
const format = require('pg-format');

let cache = {
    proyectos: null,
    timestamp: null
};

const OBTENER_PROYECTOS_QUERY = 'SELECT * FROM proyectos ORDER BY id DESC';

const obtenerProyectos = async (req, res) => {
    try {
        if (cache.proyectos) {
            return res.json(cache.proyectos);
        }

        const { rows } = await db.query(OBTENER_PROYECTOS_QUERY);
        
        cache.proyectos = rows;

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//GET /api/proyectos/:id

const obtenerProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows, rowCount } = await db.query('SELECT * FROM proyectos WHERE id = $1', [id]);
        
        if ( rowCount === 0){
            return res.status(404).json({ error: 'Proyecto no encontrado.' });
        }

        res.json(rows[0]);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearProyecto = async (req, res) => {
    try {
        const { titulo, cuerpo } = req.body;

        const { rows } = await db.queryWithAudit(
            'INSERT INTO proyectos (titulo, cuerpo, usuario_id) VALUES ($1, $2, current_setting(\'audit.user_id\')::bigint) RETURNING *',
            [titulo, cuerpo],
            req
        );

        cache.proyectos = null;

        res.status(201).json({ message: 'Proyecto creado exitosamente', data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const agregarTecnologiaAProyecto = async (req, res) => {
    try {
        const { proyectoId } = req.params;
        const { tecnologiaId } = req.body;
        const usuarioId = req.usuario.id;

        const proyecto = await db.query('SELECT id FROM proyectos WHERE id = $1 AND usuario_id = $2',
            [proyectoId, usuarioId]);
        if (proyecto.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado o no tienes permiso..'});
        }

        const tecnologia = await db.query('SELECT id FROM tecnologias WHERE id = $1', [tecnologiaId]);
        if (tecnologia.rows.length === 0) {
            return res.status(404).json({ error: 'La tecnología no fue encontrada.' });
        }

        const { rows } = await db.queryWithAudit(
            'INSERT INTO proyectos_tecnologias (proyecto_id, tecnologia_id) VALUES ($1, $2) RETURNING *',
            [proyectoId, tecnologiaId],
            req
        );

        res.status(201).json({ message: 'Tecnologia asociada al proyecto exitosamente.'});

    } catch (error) {
        if (error.code === '23505'){
            return res.status(400).json({ error: 'Esta tecnología ya está asociada a este proyecto.'});
        }
        res.status(500).json({ error: error.message });
    }
}

const asociarTecnologiasAProyecto = async (req, res) => {
    const client = await db.pool.connect();

    try {
        const { proyectoId } = req.params;
        const { tecnologiaIds } = req.body;
        const usuarioId = req.usuario.id;
        if(!Array.isArray(tecnologiaIds) || tecnologiaIds.length === 0) {
            return res.status(400).json({ error: 'Se requiere un arreglo de tecnologias'});
        }

        await client.query('BEGIN');
        const proyecto = await client.query(
            'SELECT id FROM proyectos WHERE id = $1 AND usuario_id = $2',
            [proyectoId, usuarioId]
        );
        if (proyecto.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Proyecto no encontrado o no tienes permiso.' });
        }

        const userId = req.usuario ? req.usuario.id : null;
        const ipAddress = req.ip;
        await client.query("SELECT set_config('audit.user_id', $1, false)", [userId]);
        await client.query("SELECT set_config('audit.ip_address', $1, false)", [ipAddress]);

        const tecnologiasExistentes = await client.query('SELECT id from tecnologias WHERE id = ANY($1::bigint[])', [tecnologiaIds]);

        if (tecnologiasExistentes.rows.length !== tecnologiaIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Una o más tecnologías no fueron encontradas.'});
        }
        const values = tecnologiaIds.map(tecnologiaId => [proyectoId, tecnologiaId]);
        const sql = format('INSERT INTO proyectos_tecnologias (proyecto_id, tecnologia_id) VALUES %L RETURNING *', values);
        const { rows } = await client.query(sql);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Tecnologías asociadas exitosamente.', data: rows});
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Una o mas tecnologías ya estan asociadas al proyecto.'});
        }
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

const eliminarProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const { rows, rowCount } = await db.queryWithAudit(
            'DELETE FROM proyectos WHERE id = $1 and usuario_id = $2 RETURNING *',
            [id, usuarioId],
            req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado o no tienes permiso para eliminarlo.' });
        }

        cache.proyectos = null;

        res.json({ message: 'Proyecto eliminado exitosamente', data: rows[0]} );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarTecnologiaDeProyecto = async (req, res) => {
    try {
        const { proyectoId, tecnologiaId } = req.params;
        const usuarioId = req.usuario.id;
        const { rowCount } = await db.queryWithAudit(
            `DELETE FROM proyectos_tecnologias pt
             WHERE pt.proyecto_id = $1 AND pt.tecnologia_id = $2
             AND EXISTS (SELECT 1 FROM proyectos p WHERE p.id = pt.proyecto_id AND p.usuario_id = $3)`,
            [proyectoId, tecnologiaId, usuarioId],
            req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'La relación entre el proyecto  y la tecnología no fue encontrada o no tienes permiso para eliminarla..'});
        }

        res.json({ message: 'Tecnología desasociada del proyecto exitosamente.' });
    } catch {
        res.status(500).json({ error: error.message });
    }
};

const actualizarProyecto = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        const { titulo, cuerpo, estado, href, inicio, final } = req.body;

        const camposAActualizar = [];
        const valores = [];
        let contadorParametros = 1;

        if (titulo !== undefined) {
            camposAActualizar.push(`titulo = $${contadorParametros++}`);
            valores.push(titulo);
        }
        if (cuerpo !== undefined) {
            camposAActualizar.push(`cuerpo = $${contadorParametros++}`);
            valores.push(cuerpo);
        }
        if (estado !== undefined) {
            camposAActualizar.push(`estado = $${contadorParametros++}`);
            valores.push(estado);
        }
        if (href !== undefined) {
            camposAActualizar.push(`href = $${contadorParametros++}`);
            valores.push(href);
        }
        if (inicio !== undefined) {
            camposAActualizar.push(`inicio = $${contadorParametros++}`);
            valores.push(inicio);
        }
        if (final !== undefined) {
            camposAActualizar.push(`final = $${contadorParametros++}`);
            valores.push(final);
        }
        if (camposAActualizar.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron campos para actualizar'});
        }

        const consultaSQL = `
            UPDATE proyectos
            SET ${camposAActualizar.join(', ')}
            WHERE id = $${contadorParametros} AND usuario_id = $${contadorParametros + 1}
            RETURNING *
        `;

        const parametrosFinales = [...valores, id, usuarioId];
        
        const { rows, rowCount } = await db.queryWithAudit(consultaSQL, parametrosFinales, req);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado o no tienes permisos.'});
        }
        
        cache.proyectos = null;

        res.json({ message: 'Proyecto actualizado exitosamente', data: rows[0] });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    obtenerProyectos,
    crearProyecto,
    agregarTecnologiaAProyecto,
    asociarTecnologiasAProyecto,
    eliminarProyecto,
    eliminarTecnologiaDeProyecto,
    actualizarProyecto,
    obtenerProyecto
}