// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ msg: 'Acceso denegado' });
    }

    try {
        const tokenLimpio = token.replace('Bearer ', '');
        const decoded = jwt.verify(tokenLimpio, process.env.JWT_SECRET);

        req.usuario = decoded.usuario;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token inválido' });
    }
};