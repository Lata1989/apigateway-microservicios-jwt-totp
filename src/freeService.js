const express = require('express');
const app = express();
const PORT = process.env.PORT3 || 3003;

// Middleware para parsear el body en formato JSON
app.use(express.json());

// Ruta para manejar el POST
app.post('/', (req, res) => {
    const { user, appName, token } = req.body;
    
    // Aquí podrías manejar la lógica que necesites con los datos recibidos
    console.log(`Recibido en el microservicio libre: user=${user}, appName=${appName}, token=${token}`);
    
    // Responder algo al cliente
    res.send('Datos recibidos correctamente en el Servicio Libre 😊');
});

// Ruta GET para mantener la funcionalidad original
app.get('/', (req, res) => {
    res.send('Respuesta desde el Servicio Libre 😊');
});

// Inicialización del servidor
app.listen(PORT, () => {
    console.log(`Microservicio Libre escuchando en http://localhost:${PORT}`);
});
