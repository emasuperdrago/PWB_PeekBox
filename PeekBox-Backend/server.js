const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db'); // Assicurati che db.js contenga le tabelle aggiornate

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotta di test
app.get('/', (req, res) => {
    res.send('🚀 Backend di PeekBox attivo e pronto!');
});

// --- 1. UTENTI: REGISTRAZIONE ---
app.post('/api/registrazione', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO utenti (username, email, password) VALUES (?, ?, ?)';
        
        db.run(sql, [username, email, hashedPassword], function(err) {
            if (err) {
                return res.status(400).json({ error: "Email già registrata o dati non validi." });
            }
            res.status(201).json({ id: this.lastID, message: "Utente creato con successo!" });
        });
    } catch (error) {
        res.status(500).json({ error: "Errore interno del server." });
    }
});

// --- 2. UTENTI: LOGIN ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM utenti WHERE email = ?';
    
    db.get(sql, [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: "Credenziali non valide." });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            res.json({ 
                message: "Accesso eseguito!", 
                user: { id: user.id, username: user.username, email: user.email } 
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide." });
        }
    });
});

// --- 3. ARMADI: CARICAMENTO (per utente) ---
app.get('/api/armadi/:utenteId', (req, res) => {
    const utenteId = req.params.utenteId;
    const sql = 'SELECT * FROM armadi WHERE rif_utente = ?';
    db.all(sql, [utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ armadi: rows });
    });
});

// --- 4. ARMADI: CREAZIONE ---
app.post('/api/armadi', (req, res) => {
    const { nome, rif_utente } = req.body;
    const sql = 'INSERT INTO armadi (nome, rif_utente) VALUES (?, ?)';
    db.run(sql, [nome, rif_utente], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: "Armadio creato!" });
    });
});

// --- 5. BOX: CARICAMENTO (filtrato per utente tramite JOIN) ---
app.get('/api/box/:utenteId', (req, res) => {
    const utenteId = req.params.utenteId;
    const sql = `
        SELECT box.* 
        FROM box 
        JOIN armadi ON box.rif_armadio = armadi.id 
        WHERE armadi.rif_utente = ?
    `;
    db.all(sql, [utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ box: rows }); 
    });
});

// --- 6. BOX: CREAZIONE ---
app.post('/api/box', (req, res) => {
    const { nome, rif_armadio, is_preferito } = req.body;
    const pref_db = is_preferito ? 1 : 0; 
    const sql = 'INSERT INTO box (nome, rif_armadio, is_preferito) VALUES (?, ?, ?)';
    db.run(sql, [nome, rif_armadio, pref_db], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: "Box creata!" });
    });
});

// --- 7. OGGETTI: CARICAMENTO (per box specifica) ---
app.get('/api/oggetti/:boxId', (req, res) => {
    const boxId = req.params.boxId;
    const sql = 'SELECT * FROM oggetti WHERE rif_box = ?';
    db.all(sql, [boxId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ oggetti: rows });
    });
});

// --- 8. OGGETTI: CREAZIONE ---
app.post('/api/oggetti', (req, res) => {
    const { nome, descrizione, tipo, fragile, quantita, foto, rif_box } = req.body;
    const fragile_db = fragile ? 1 : 0; // Gestione boolean per SQLite

    const sql = `INSERT INTO oggetti (nome, descrizione, tipo, fragile, quantita, foto, rif_box) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [nome, descrizione, tipo, fragile_db, quantita || 1, foto, rif_box], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Errore nel salvataggio dell'oggetto." });
        }
        res.status(201).json({ id: this.lastID, message: "Oggetto aggiunto alla box!" });
    });
});

// Avvio Server
app.listen(PORT, () => {
    console.log(`🚀 SERVER IN ESECUZIONE: http://localhost:${PORT}`);
});