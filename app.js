// app.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const proyectosRoutes = require('./routes/proyectos.routes');
const uploadRoutes = require('./routes/upload.routes');
const tecnologiasRoutes = require('./routes/tecnologias.routes');
const imagenesRoutes = require('./routes/imagenes.routes');

const app = express();
app.set('trust proxy', true);
const port = process.env.PORT || 4000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) =>
{
    res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tecnologias', tecnologiasRoutes);
app.use('/api/imagenes', imagenesRoutes);

module.exports = app;
