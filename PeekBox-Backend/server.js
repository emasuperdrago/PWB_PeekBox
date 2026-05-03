const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotta di test
app.get('/', (req, res) => {
    res.send('🚀 Backend di PeekBox attivo e pronto!');
});

// --- ROTTA REGISTRAZIONE ---
app.post('/api/registrazione', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Criptiamo la password prima di salvarla
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = 'INSERT INTO utenti (username, email, password) VALUES (?, ?, ?)';
        
        db.run(sql, [username, email, hashedPassword], function(err) {
            if (err) {
                console.error("Errore DB:", err.message);
                return res.status(400).json({ error: "Email già registrata o dati non validi." });
            }
            res.status(201).json({ 
                id: this.lastID, 
                message: "Utente creato con successo (password criptata)!" 
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Errore interno durante l'hashing." });
    }
});

// --- ROTTA LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM utenti WHERE email = ?';
    
    db.get(sql, [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: "Errore nel database." });
        }
        
        if (!user) {
            return res.status(401).json({ error: "Credenziali non valide (email)." });
        }

        // Confrontiamo la password inserita con quella criptata nel DB
        const match = await bcrypt.compare(password, user.password);
        
        if (match) {
            // Login riuscito: restituiamo i dati utente (tranne la password!)
            res.json({ 
                message: "Accesso eseguito!", 
                user: { id: user.id, username: user.username, email: user.email } 
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide (password)." });
        }
    });
});

// Avvio Server
app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`🚀 SERVER IN ESECUZIONE: http://localhost:${PORT}`);
    console.log(`📅 Database SQLite collegato correttamente.`);
    console.log(`🔒 Sicurezza Bcrypt attiva.`);
    console.log(`==========================================\n`);
});