const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 3000;

const SECRET_KEY = "chiave_super_segreta_peekbox";

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE DI AUTENTICAZIONE ---
function verificaToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Accesso negato. Token mancante." });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token non valido o scaduto." });
        req.user = user;
        next();
    });
}

app.get('/', (req, res) => {
    res.send('🚀 Backend di PeekBox attivo e protetto!');
});

// --- UTENTI ---
app.post('/api/registrazione', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Tutti i campi sono obbligatori." });

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO utenti (username, email, password) VALUES (?, ?, ?)';
        db.run(sql, [username, email, hashedPassword], function(err) {
            if (err) return res.status(400).json({ error: "Email già registrata." });
            res.status(201).json({ id: this.lastID, message: "Utente creato!" });
        });
    } catch (error) { res.status(500).json({ error: "Errore server." }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email e password sono obbligatorie." });

    const sql = 'SELECT * FROM utenti WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Credenziali non valide." });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
            res.json({
                message: "Accesso eseguito!",
                token: token,
                user: { id: user.id, username: user.username, email: user.email }
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide." });
        }
    });
});

// --- ARMADI ---
app.get('/api/armadi/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId)) return res.status(403).json({ error: "Non autorizzato." });

    const sql = 'SELECT * FROM armadi WHERE rif_utente = ?';
    db.all(sql, [req.params.utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ armadi: rows });
    });
});

app.post('/api/armadi', verificaToken, (req, res) => {
    const { nome, rif_utente } = req.body;
    db.run('INSERT INTO armadi (nome, rif_utente) VALUES (?, ?)', [nome, rif_utente], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.delete('/api/armadi/:id', verificaToken, (req, res) => {
    const sql = 'DELETE FROM armadi WHERE id = ? AND rif_utente = ?';
    db.run(sql, [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(403).json({ error: "Non autorizzato o armadio non trovato." });
        }
        res.json({ message: "Armadio eliminato!" });
    });
});

// --- BOX ---
app.get('/api/box/singola/:id', verificaToken, (req, res) => {
    const sql = `
        SELECT box.*, armadi.nome as nome_armadio, armadi.rif_utente
        FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ?
    `;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Box non trovata." });
        if (String(row.rif_utente) !== String(req.user.id)) return res.status(403).json({ error: "Non autorizzato." });
        res.json({ box: row });
    });
});

app.get('/api/box/:utenteId', verificaToken, (req, res) => {
    // Esclude le box nel cestino (data_eliminazione non null)
    const sql = `
        SELECT box.*, GROUP_CONCAT(DISTINCT oggetti.tipo) as categorie_presenti,
               MAX(oggetti.fragile) as contiene_fragili,
               COUNT(oggetti.id) as num_oggetti
        FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        LEFT JOIN oggetti ON oggetti.rif_box = box.id
        WHERE armadi.rif_utente = ?
          AND box.data_eliminazione IS NULL
        GROUP BY box.id
    `;
    db.all(sql, [req.params.utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ box: rows });
    });
});

app.post('/api/box', verificaToken, (req, res) => {
    const { nome, rif_armadio, is_preferito } = req.body;
    db.run('INSERT INTO box (nome, rif_armadio, is_preferito) VALUES (?, ?, ?)',
        [nome, rif_armadio, is_preferito ? 1 : 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/box/preferito/:id', verificaToken, (req, res) => {
    const { is_preferito } = req.body;
    const sql = 'UPDATE box SET is_preferito = ? WHERE id = ?';
    db.run(sql, [is_preferito ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Stato preferito aggiornato!" });
    });
});

// Soft delete: imposta data_eliminazione invece di cancellare fisicamente
app.delete('/api/box/:id', verificaToken, (req, res) => {
    const now = new Date().toISOString();
    db.run('UPDATE box SET data_eliminazione = ? WHERE id = ?', [now, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Box spostata nel cestino!" });
    });
});

// --- BOX ELIMINATE — cestino (max 30 giorni) ---
app.get('/api/box/eliminate/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId))
        return res.status(403).json({ error: "Non autorizzato." });

    // Restituisce solo le box eliminate negli ultimi 30 giorni
    const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const sql = `
        SELECT box.*, armadi.nome as nome_armadio,
               COUNT(oggetti.id) as num_oggetti
        FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        LEFT JOIN oggetti ON oggetti.rif_box = box.id
        WHERE armadi.rif_utente = ?
          AND box.data_eliminazione IS NOT NULL
          AND box.data_eliminazione >= ?
        GROUP BY box.id
        ORDER BY box.data_eliminazione DESC
    `;
    db.all(sql, [req.params.utenteId, trentaGiorniFa], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ box_eliminate: rows });
    });
});

// Pulizia automatica: elimina definitivamente le box oltre i 30 giorni
app.delete('/api/box/cestino/pulisci', verificaToken, (req, res) => {
    const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.run('DELETE FROM box WHERE data_eliminazione IS NOT NULL AND data_eliminazione < ?',
        [trentaGiorniFa], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Rimosse ${this.changes} box scadute.` });
    });
});

// --- OGGETTI ---
app.get('/api/oggetti/:boxId', verificaToken, (req, res) => {
    db.all('SELECT * FROM oggetti WHERE rif_box = ?', [req.params.boxId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ oggetti: rows });
    });
});

app.post('/api/oggetti', verificaToken, (req, res) => {
    const { nome, descrizione, tipo, fragile, quantita, foto, rif_box } = req.body;
    const sql = `INSERT INTO oggetti (nome, descrizione, tipo, fragile, quantita, foto, rif_box) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [nome, descrizione, tipo, fragile ? 1 : 0, quantita || 1, foto, rif_box], function(err) {
        if (err) return res.status(500).json({ error: "Errore salvataggio." });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/oggetti/:id', verificaToken, (req, res) => {
    const { nome, descrizione, tipo, fragile, quantita, foto } = req.body;
    const sql = `UPDATE oggetti SET nome = ?, descrizione = ?, tipo = ?, fragile = ?, quantita = ?, foto = ? WHERE id = ?`;
    db.run(sql, [nome, descrizione, tipo, fragile ? 1 : 0, quantita || 1, foto, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Errore aggiornamento." });
        res.json({ message: "Oggetto aggiornato!" });
    });
});

app.delete('/api/oggetti/:id', verificaToken, (req, res) => {
    db.run('DELETE FROM oggetti WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Oggetto eliminato!" });
    });
});

// --- RICERCA ---
app.get('/api/cerca/:utenteId', verificaToken, (req, res) => {
    const termine = `%${req.query.q}%`;
    const sql = `
        SELECT oggetti.*, box.nome as nome_box, armadi.nome as nome_armadio
        FROM oggetti
        JOIN box ON oggetti.rif_box = box.id
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE armadi.rif_utente = ?
          AND box.data_eliminazione IS NULL
          AND (oggetti.nome LIKE ? OR oggetti.descrizione LIKE ? OR oggetti.tipo LIKE ?)
    `;
    db.all(sql, [req.params.utenteId, termine, termine, termine], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ risultati: rows });
    });
});

// --- TIPOLOGIE ---
app.get('/api/tipologie/:utenteId', verificaToken, (req, res) => {
    db.all('SELECT * FROM tipologie WHERE rif_utente = ?', [req.params.utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ tipologie: rows });
    });
});

app.post('/api/tipologie', verificaToken, (req, res) => {
    const { nome, rif_utente } = req.body;
    db.run('INSERT INTO tipologie (nome, rif_utente) VALUES (?, ?)', [nome, rif_utente], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.delete('/api/tipologie/:id', verificaToken, (req, res) => {
    db.run('DELETE FROM tipologie WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Tipologia eliminata!" });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER ATTIVO: http://localhost:${PORT}`);
});
