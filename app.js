// app.js
const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const proyectosRoutes = require('./routes/proyectos.routes');
const uploadRoutes = require('./routes/upload.routes');
const tecnologiasRoutes = require('./routes/tecnologias.routes');
const imagenesRoutes = require('./routes/imagenes.routes');
const { Credentials } = require('aws-sdk');

const app = express();
app.set('trust proxy', true);
const port = process.env.PORT || 4000;
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5500', 'https://plynte.com'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials:true,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions)); 

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
