// routes/tecnologias.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

const { obtenerTecnologias, crearTecnologia } = require('../controllers/tecnologias.controller');

router.get('/', obtenerTecnologias);

router.post('/', authMiddleware, crearTecnologia);

module.exports = router;