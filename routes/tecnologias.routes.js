const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

const { 
    obtenerTecnologias, 
    crearTecnologia,
    actualizarTecnologia,  // <-- Importar la nueva función
    eliminarTecnologia   // <-- Importar la nueva función
} = require('../controllers/tecnologias.controller');

router.get('/', obtenerTecnologias);

router.post('/', authMiddleware, crearTecnologia);

// --- NUEVAS RUTAS AÑADIDAS ---

/**
 * @route   PATCH /api/tecnologias/:id
 * @desc    Actualizar el nombre de una tecnología
 * @access  Private
 */
router.patch('/:id', authMiddleware, actualizarTecnologia);

/**
 * @route   DELETE /api/tecnologias/:id
 * @desc    Eliminar una tecnología
 * @access  Private
 */
router.delete('/:id', authMiddleware, eliminarTecnologia);


module.exports = router;