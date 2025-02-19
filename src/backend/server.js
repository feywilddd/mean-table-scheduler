require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS, 
    port: process.env.DB_PORT
});

// Vérifier la connexion à PostgreSQL
pool.connect()
  .then(() => console.log("Connexion PostgreSQL réussie !"))
  .catch(err => console.error("Erreur de connexion PostgreSQL :", err.message));

app.use(cors());
app.use(express.json());

// Route pour récupérer les items
app.get('/api/items', async (req, res) => {
    try {
        console.log("Requête reçue : GET /api/items");
        const result = await pool.query('SELECT * FROM items');
        console.log("Résultats SQL :", result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error("Erreur SQL :", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
