const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT0 || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const TOTP_SERVICE_URL = process.env.TOTP_SERVICE_URL;

let storedToken = null;
let tokenExpiration = null;
const TOKEN_DURATION_MS = 3600000; // 1 hora en milisegundos

// Middleware para verificar el token JWT
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (storedToken && token === storedToken && tokenExpiration > Date.now()) {
        req.user = jwt.decode(token);
        next();
    } else if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).send('Token inválido');
            }
            storedToken = token;
            tokenExpiration = Date.now() + TOKEN_DURATION_MS;
            req.user = user;
            next();
        });
    } else {
        res.status(401).send('Token requerido');
    }
};

// Middleware para verificar el TOTP
const authenticateTOTP = async (req, res, next) => {
    console.log('Cuerpo de la solicitud:', req.body);

    const { user, appName, token } = req.body;

    if (!user || !appName || !token) {
        return res.status(400).send('Datos requeridos: user, appName, token');
    }

    try {
        const response = await axios.post(`${TOTP_SERVICE_URL}/validate`, {
            user,
            appName,
            token,
        });

        if (response.data === 'TOTP válido') {
            next();
        } else {
            res.status(401).send('TOTP inválido');
        }
    } catch (err) {
        console.error('Error al validar el TOTP:', err.response?.data || err.message);
        res.status(500).send('Error al validar el TOTP');
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

// Redirección de solicitudes a Microservicio 3 - Servicio libre (Acceso protegido + Validación TOTP)
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
