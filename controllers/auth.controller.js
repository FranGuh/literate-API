// controllers/auth.controller.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- Función auxiliar para dominio (si la necesitas) ---
const getCookieDomain = () => {
  return process.env.NODE_ENV === 'production' ? '.plynte.com' : undefined; 
};

const register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ msg: 'Incluye los demas campos'});
        }

        const salt = await bcrypt.genSalt(10);
        const contraseña_hash = await bcrypt.hash(password, salt);

        // Pedimos que nos devuelva más datos del usuario recién creado
        const { rows } = await db.query(
            "INSERT INTO usuarios (nombre, email, contraseña_hash) VALUES ($1,$2,$3) RETURNING id, nombre, email", // Añadido nombre
            [nombre, email, contraseña_hash]
            // Quitamos 'req' que no se usa aquí
        );

        if (rows.length === 0) {
             throw new Error("No se pudo registrar al usuario."); // Mejor manejo de error
        }
        
        const nuevoUsuario = rows[0]; // Usuario recién creado
        const payload = { usuario: { id: nuevoUsuario.id }};

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                     console.error("Error al firmar token en registro:", err);
                     // Importante lanzar el error para que lo capture el catch principal
                     return res.status(500).json({ error: 'Error al generar token' }); 
                }
                
                // --- Preparamos userResponse CON los datos del nuevo usuario ---
                 const userResponse = {
                    id: nuevoUsuario.id,
                    nombre: nuevoUsuario.nombre, // Ahora tenemos el nombre
                    email: nuevoUsuario.email
                };

                // Enviamos token Y user
                res.status(201).json({ 
                    msg: 'Usuario registrado y logueado', 
                    token, 
                    user: userResponse
                });
            }
        );

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ error: `El email '${req.body.email}' ya esta asociado a una cuenta.`});
        }
        console.error("Error en register catch:", error.message);
        res.status(500).json({ error:'Error en el registro' });
    }
};

const login = async (req, res) => {
    try {
        console.log("LOGIN: Recibida petición para:", req.body.email); // LOG 1
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ msg: 'Introduce los campos!'});
        }

        console.log("LOGIN: Consultando base de datos..."); // LOG 2
        // Pedimos todos los datos necesarios del usuario
        const { rows } = await db.query("SELECT id, nombre, email, contraseña_hash FROM usuarios WHERE email = $1", [email]);
        console.log("LOGIN: Consulta a BD completada. Usuarios encontrados:", rows.length); // LOG 3
        
        if (rows.length === 0) {
            console.log("LOGIN: Usuario no encontrado."); // LOG 4
            // Usar 401 para Unauthorized es más estándar que 400
            return res.status(401).json({ msg: 'Credenciales inválidas' }); 
        }

        const usuarioEncontrado = rows[0]; // Guardamos al usuario encontrado
        console.log("LOGIN: Comparando contraseña..."); // LOG 5
        const isMatch = await bcrypt.compare(password, usuarioEncontrado.contraseña_hash);
        console.log("LOGIN: Comparación completada. Coincide:", isMatch); // LOG 6

        if (!isMatch) {
            console.log("LOGIN: Contraseña incorrecta."); // LOG 7
            return res.status(401).json({ msg: 'Credenciales inválidas' }); // Usar 401
        }

        // --- CONSTRUIMOS userResponse ANTES de jwt.sign ---
        const userResponse = {
            id: usuarioEncontrado.id,
            nombre: usuarioEncontrado.nombre,
            email: usuarioEncontrado.email
            // Añade aquí otros campos seguros que quieras enviar
        };
        // ---

        console.log("LOGIN: Firmando token JWT..."); // LOG 8
        const payload = { usuario: { id: usuarioEncontrado.id }}; // El payload del token solo necesita el ID

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error("LOGIN: Error al firmar JWT!", err); // LOG 9 (ERROR)
                    // Lanzar error aquí no funciona bien con callbacks, mejor enviar respuesta de error
                    return res.status(500).json({ error: 'Error al generar token' });
                }
                console.log("LOGIN: Token firmado. Enviando respuesta..."); // LOG 10
                
                // ¡Ahora sí! Enviamos token y el userResponse que creamos antes
                res.status(200).json({ token, user: userResponse }); 
            }
        );
        
    } catch (error) {
         // Quitamos los checks de error específicos de registro que estaban aquí por error
         console.error("LOGIN: Error en el bloque catch!", error.message); // LOG 11 (ERROR)
         res.status(500).json({ error: error.message || 'Error en el servidor durante el login' });
    }
};

// --- Logout sigue igual ---
const logout = (req, res) => {
    // Ya no usamos cookies, así que el logout es más simple (opcionalmente invalidar token si usas blacklist)
    // Por ahora, solo respondemos éxito. El frontend limpiará su localStorage.
    res.status(200).json({ msg: 'Logout procesado en backend' }); 
};

module.exports = { register, login, logout };

