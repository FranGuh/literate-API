// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../config/upload');
const { subirImagen } = require('../controllers/upload.controller');

router.post('/image/:projectId', authMiddleware, upload.single('image'), subirImagen);

module.exports = router;