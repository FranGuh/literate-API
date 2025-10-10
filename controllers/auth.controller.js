// controllers/auth.controller.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ msg: 'Incluye los demas campos'});
        }

        const salt = await bcrypt.genSalt(10);
        const contraseña_hash = await bcrypt.hash(password, salt);

        const { rows } = await db.query(
            "INSERT INTO usuarios (nombre, email, contraseña_hash) VALUES ($1,$2,$3) RETURNING id, email",
            [nombre, email, contraseña_hash],
            req
        );

        res.status(201).json({ msg: 'Usuario registrado', usuario: rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error:'Error en el registro' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ msg: 'Introduce los campos!'});
        }

        const { rows } = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (rows.length === 0) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, rows[0].contraseña_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        const payload = { usuario: { id: rows[0].id }};

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
        
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: `El email '${req.body.email}' ya esta asociado a una cuenta.`});
        }
        if (error.code === '23514' && error.constraint === 'email_valido') {
            return res.status(400).json({ error: 'El formato del email no es válido.'});
        }

        console.error(error.message);
        res.status(500).json({ error:'Error en el registro' });
    }
};

module.exports = { register, login };