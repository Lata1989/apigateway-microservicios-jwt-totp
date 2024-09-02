const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT0 || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

let storedToken = null;
let tokenExpiration = null;
const TOKEN_DURATION_MS = 3600000; // 1 hora en milisegundos

// Middleware para verificar el token JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Obtener el token del header Authorization

    if (storedToken && token === storedToken && tokenExpiration > Date.now()) {
        // Token almacenado es válido
        req.user = jwt.decode(token); // Decodificar el token sin verificar (solo para obtener datos del usuario)
        next();
    } else if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).send('Token inválido');
            }
            // Almacenar el nuevo token y su fecha de expiración
            storedToken = token;
            tokenExpiration = Date.now() + TOKEN_DURATION_MS;
            req.user = user; // Adjuntar el usuario al request
            next(); // Continuar al siguiente middleware o ruta
        });
    } else {
        res.status(401).send('Token requerido');
    }
};

// Redirección de solicitudes a Microservicio 1 - Auth JWT (Acceso libre)
app.use('/auth', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/auth': '',
    },
}));

// Redirección de solicitudes a Microservicio 2 - TOTP (Acceso protegido)
app.use('/totp', authenticateJWT, createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
        '^/totp': '',
    },
}));

// Redirección de solicitudes a Microservicio 3 - Servicio libre (Acceso protegido)
app.use('/service', authenticateJWT, createProxyMiddleware({
    target: 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: {
        '^/service': '',
    },
}));

// Ruta principal
app.get('/', (req, res) => {
    res.send('Respuesta desde el API Gateway 😊.');
});

app.listen(PORT, () => {
    console.log(`API Gateway escuchando en http://localhost:${PORT}`);
});
