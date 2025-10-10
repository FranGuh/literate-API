// controllers/imagenes.controller.js
const db = require('../config/db');
const aws = require('aws-sdk');
const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const actualizarImagen = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;
        const { texto_alt } = req.body;

        if(!texto_alt) {
            return res.status(400).json({ error: 'El campo texto_alt es requerido.'});
        }

        const { rows, rowCount } = await db.queryWithAudit(
            `UPDATE imagenes i SET texto_alt = $1
             FROM proyectos p
             WHERE i.id = $2 AND i.proyecto_id = p.id AND p.usuario_id = $3
             RETURNING i.*`,
             [texto_alt, id, usuarioId],
             req
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Imagen no encontrada o no tienes permisos.'});
        }

        res.json({ message: 'Texto alternativo actualizado exitosamente', data: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarImagen = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const { rows, rowCount } = await db.queryWithAudit(
            `DELETE FROM images i
            USING proyectos p
            WHERE i.id = $1 AND i.proyecto_id = p.id AND p.usuario_id = $2
            RETURNING i.url`,
            [id, usuarioId],
            req
        );

        if (rowCount === 0){
            return res.status(404).json({ error: 'Imagen no encontrada o no tienes permiso.'});
        }

        const imageUrl = rows[0].url;
        const key = imageUrl.split(process.env.AWS_BUCKET_NAME + '/')[1];

        await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        }).promise();

        res.json({ message: 'Imagen eliminada exitosamente.'});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    actualizarImagen,
    eliminarImagen
};