// routes/imagene.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { actualizarImagen, eliminarImagen } = require('../controllers/imagenes.controller');

router.patch('/:id', authMiddleware, actualizarImagen);

router.delete('/:id',authMiddleware, eliminarImagen);

module.exports = router;