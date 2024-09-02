const express = require('express');

const app = express();
const PORT = process.env.PORT3 || 3003;

// Ruta principal
app.get('/', (req, res) => {
    res.send('Respuesta desde el Servicio Libre 😊');
});

// Inicialización del servidor
app.listen(PORT, () => {
    console.log(`Microservicio Libre escuchando en http://localhost:${PORT}`);
});
