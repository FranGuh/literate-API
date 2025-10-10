// routes/proyectos.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

const { obtenerProyectos,
     obtenerProyecto,
     crearProyecto,
      agregarTecnologiaAProyecto,
       asociarTecnologiasAProyecto,
    eliminarProyecto,
eliminarTecnologiaDeProyecto, 
actualizarProyecto} = require('../controllers/proyectos.controller');

router.get('/', obtenerProyectos);

router.get('/:id', obtenerProyecto);

router.post('/', authMiddleware, crearProyecto);

router.post('/:proyectoId/tecnologia', authMiddleware, agregarTecnologiaAProyecto);

router.post('/:proyectoId/tecnologias', authMiddleware, asociarTecnologiasAProyecto);

router.delete('/:id', authMiddleware, eliminarProyecto);

router.delete('/:proyectoId/tecnologias/:tecnologiaId', authMiddleware, eliminarTecnologiaDeProyecto);

router.patch('/:id', authMiddleware, actualizarProyecto);
module.exports = router;