const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

const { 
    obtenerProyectos,
    obtenerProyecto,
    crearProyecto,
    agregarTecnologiaAProyecto,
    asociarTecnologiasAProyecto,
    eliminarProyecto,
    eliminarTecnologiaDeProyecto, 
    actualizarProyecto, 
    toggleLikeAProyecto // <-- Ya lo tenías importado
} = require('../controllers/proyectos.controller');

// --- RUTAS PÚBLICAS (GET) ---
router.get('/', obtenerProyectos);
router.get('/:id', obtenerProyecto);

// --- RUTAS PROTEGIDAS (POST, PATCH, DELETE) ---
router.post('/', authMiddleware, crearProyecto);
router.patch('/:id', authMiddleware, actualizarProyecto);
router.delete('/:id', authMiddleware, eliminarProyecto);

// --- RUTAS DE LIKES (PROTEGIDAS) ---
// Alterna (da/quita) un like a un proyecto
router.post('/:proyectoId/like', authMiddleware, toggleLikeAProyecto);

// --- RUTAS DE TECNOLOGÍAS (PROTEGIDAS) ---
// Asociación individual
router.post('/:proyectoId/tecnologia', authMiddleware, agregarTecnologiaAProyecto);
// Asociación por lotes
router.post('/:proyectoId/tecnologias', authMiddleware, asociarTecnologiasAProyecto);
// Eliminación de asociación
router.delete('/:proyectoId/tecnologias/:tecnologiaId', authMiddleware, eliminarTecnologiaDeProyecto);

module.exports = router;