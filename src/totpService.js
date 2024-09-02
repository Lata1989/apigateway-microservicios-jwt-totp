const express = require('express');
const speakeasy = require('speakeasy');
const { MongoClient } = require('mongodb');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT2 || 3002;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const USER_COLLECTION = process.env.USER_COLLECTION;
const TOTP_COLLECTION = process.env.TOTP_COLLECTION;
const JWT_SECRET = process.env.JWT_SECRET;

let db;

// Middleware para parsear JSON
app.use(express.json());

// Middleware para verificar el token JWT
app.use(async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send('Token requerido');

    try {
        req.user = await jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).send('Token inválido');
    }
});

// Ruta principal
app.get('/', (req, res) => {
    res.send('Respuesta desde el microservicio de TOTP 😊.');
});

// Función para generar el código QR
const generateQRCode = async (otpauth_url) => {
    try {
        return await QRCode.toDataURL(otpauth_url);
    } catch {
        throw new Error('Error al generar el código QR');
    }
};

// Ruta para generar un secreto TOTP y el código QR
app.post('/generate', async (req, res) => {
    const { user } = req.body;
    if (!user) return res.status(400).send('Falta el nombre de usuario');

    try {
        const usersCollection = db.collection(USER_COLLECTION);
        const totpCollection = db.collection(TOTP_COLLECTION);

        // Verificar si el usuario está registrado
        const userExists = await usersCollection.findOne({ user });
        if (!userExists) return res.status(404).send('Usuario no registrado');

        // Verificar si el usuario ya tiene un secreto
        const existingSecret = await totpCollection.findOne({ user });
        if (existingSecret) return res.status(409).send('El usuario ya tiene un secreto registrado');

        // Generar un nuevo secreto TOTP
        const secret = speakeasy.generateSecret({ name: 'MiApp' });
        const otpauth_url = secret.otpauth_url;

        // Insertar el nuevo secreto en la base de datos
        await totpCollection.insertOne({
            user,
            appName: 'MiApp',
            secret: secret.base32
        });

        // Generar el código QR
        const qr_code = await generateQRCode(otpauth_url);

        res.json({
            secret: secret.base32,
            qr_code
        });
    } catch (err) {
        console.error('Error al generar el secreto:', err.message);
        res.status(500).send('Error del servidor: ' + err.message);
    }
});

// Ruta para validar un código TOTP
app.post('/validate', async (req, res) => {
    const { user, token } = req.body;

    if (!user || !token) return res.status(400).send('Faltan datos para la validación');

    try {
        const totpCollection = db.collection(TOTP_COLLECTION);
        const storedSecret = await totpCollection.findOne({ user });
        if (!storedSecret) return res.status(401).send('Usuario no encontrado');

        const verified = speakeasy.totp.verify({
            secret: storedSecret.secret,
            encoding: 'base32',
            token
        });

        if (verified) return res.send('TOTP válido');

        res.status(401).send('TOTP inválido');
    } catch (err) {
        console.error('Error al validar el TOTP:', err.message);
        res.status(500).send('Error del servidor: ' + err.message);
    }
});

// Conexión a MongoDB
const connectToDatabase = async () => {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Conectado a MongoDB');

        app.listen(PORT, () => {
            console.log(`Microservicio TOTP escuchando en http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Error al conectar a MongoDB:', err.message);
        process.exit(1);
    }
};

// Ejecutar la conexión a la base de datos
connectToDatabase();
