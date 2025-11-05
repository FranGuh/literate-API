const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
    obtenerComentariosPorProyecto,
    crearComentario,
    actualizarComentario,
    eliminarComentario,
    toggleLikeAComentario
} = require('../controllers/comentarios.controller');

// --- RUTAS PÚBLICAS ---
// Obtiene todos los comentarios (y sus respuestas) para un proyecto específico
router.get('/proyecto/:id', obtenerComentariosPorProyecto);

// --- RUTAS PROTEGIDAS (Requieren autenticación) ---
// Crea un nuevo comentario (o una respuesta)
router.post('/', authMiddleware, crearComentario);

// Edita un comentario propio
router.patch('/:id', authMiddleware, actualizarComentario);

// Elimina un comentario propio
router.delete('/:id', authMiddleware, eliminarComentario);

// Da o quita like a un comentario
router.post('/:id/like', authMiddleware, toggleLikeAComentario);

module.exports = router;