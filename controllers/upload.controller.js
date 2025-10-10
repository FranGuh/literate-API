// controllers/upload.controller.js
const aws = require('aws-sdk');
const sharp = require('sharp');
const db = require('../config/db');

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const subirImagen = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    try {
        const projectId = req.params.projectId;
        const usuarioId = req.usuario.id;

        const proyecto = await db.query(
            'SELECT id FROM proyectos WHERE id = $1 AND usuario_id = $2',
            [projectId, usuarioId]
        );
        if (proyecto.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado o no tienes permisos.'});
        }

        const optimizedBuffer = await sharp(req.file.buffer)
            .resize(1200, 1200, { 
                fit: 'inside', 
                withoutEnlargement: true
            })
            .toFormat('webp') 
            .webp({ quality: 80 }) 
            .toBuffer();

        // Preparar los datos para subir a S3
        const uniqueFileName = Date.now().toString() + '.webp';
        const path = `proyectos/${projectId}/${uniqueFileName}`;

        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: path,
            Body: optimizedBuffer,
            ContentType: 'image/webp' 
        };

        const data = await s3.upload(uploadParams).promise();
        const imageUrl = data.Location;

        const texto_alt = req.body.texto_alt || `Imagen de proyecto - ${new Date().toLocaleDateString('es-MX')}`;

        const dbResponse = await db.queryWithAudit(
            'INSERT INTO imagenes (url, texto_alt, proyecto_id) VALUES ($1, $2, $3) RETURNING *',
            [imageUrl, texto_alt, projectId],
            req
        )
        res.status(201).json({ 
            message: 'Imagen subida y registrada exitosamente', 
            data: dbResponse.rows[0] 
        });

    } catch (error) {
        console.error('Error al procesar o subir la imagen:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
};

module.exports = {
    subirImagen
};