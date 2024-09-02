const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const USER_COLLECTION = process.env.USER_COLLECTION;

let db;

// Middleware para parsear JSON
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.send('Respuesta desde el microservicio de autenticacion y registro 😊.');
});

// Ruta para el registro de usuarios
app.post('/register', async (req, res) => {
    const { user, password } = req.body;
    const collection = db.collection(USER_COLLECTION);

    try {
        // Verificar si el usuario ya existe
        const existingUser = await collection.findOne({ user });
        if (existingUser) {
            return res.status(409).send('Usuario ya existe');
        }

        // Insertar nuevo usuario en la base de datos
        try {
            const result = await collection.insertOne({ user, password });
            if (result.insertedId) {
                res.status(201).send('Usuario registrado exitosamente');
            } else {
                throw new Error('Error al registrar el usuario: No se pudo insertar el documento');
            }
        } catch (insertError) {
            console.error('Error al insertar el usuario:', insertError);
            res.status(500).send('Error al registrar el usuario: ' + insertError.message);
        }
    } catch (err) {
        console.error('Error del servidor:', err.message);
        res.status(500).send('Error del servidor: ' + err.message);
    }
});



// Ruta para el inicio de sesión
app.post('/login', async (req, res) => {
    const { user, password } = req.body;
    const collection = db.collection(USER_COLLECTION);

    try {
        const foundUser = await collection.findOne({ user, password });
        if (foundUser) {
            const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '1h' });
            return res.json({ token });
        }
        res.status(401).send('Usuario o contraseña incorrectos');
    } catch (err) {
        res.status(500).send('Error del servidor');
    }
});

// Conexión a MongoDB
const connectToDatabase = async () => {
    try {
        const client = await MongoClient.connect(MONGO_URI);
        db = client.db(DB_NAME);
        console.log('Conectado a MongoDB');
        app.listen(PORT, () => {
            console.log(`Microservicio Auth JWT escuchando en http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Error al conectar a MongoDB', err);
        process.exit(1);
    }
};

// Ejecutar la conexión a la base de datos
connectToDatabase();
