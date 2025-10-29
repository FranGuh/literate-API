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

        const payload = { usuario: { id: rows[0].id }};
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                
                //secure: process.env.NODE_ENV === 'production',
                // 1. Creamos la cookie
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: false,
                    maxAge: 24 * 60 * 60 * 1000, // 24 horas
                    sameSite: 'lax',
                    path: '/'
                });

                // 2. Devolvemos los datos del usuario
                res.status(201).json({ 
                    msg: 'Usuario registrado y logueado', 
                    user: {
                        id: rows[0].id,
                        nombre: rows[0].nombre,
                        email: rows[0].email
                    } 
                });
            }
        );

    } catch (error) {
        if (error.code === '23505') { // Error de email duplicado
            return res.status(400).json({ error: `El email '${req.body.email}' ya esta asociado a una cuenta.`});
        }
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
                // 1. Poner el token en una cookie HttpOnly (segura)
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: false, // true en prod (https)
                    maxAge: 24 * 60 * 60 * 1000, // 24 horas
                    sameSite: 'lax',
                    domain: getCookieDomain(),
                    path: '/' 
                });
    
                // 2. Enviar los datos del usuario (sin el hash) al frontend
                const user = {
                    id: rows[0].id,
                    nombre: rows[0].nombre,
                    email: rows[0].email
                };
                
                // 3. ¡Esto es lo que el AuthContext SÍ entiende!
                res.status(200).json({ user }); 
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


const logout = (req, res) => {
    // Una ruta de logout que limpia la cookie
    res.cookie('auth_token', '', {
        httpOnly: true,
        expires: new Date(0),
        secure: false,
        sameSite: 'lax',
        domain: getCookieDomain(),
                    path: '/' 
    });
    res.status(200).json({ msg: 'Logout exitoso' });
};
module.exports = { register, login,logout };