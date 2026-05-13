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

// --- MIDDLEWARE AUTENTICAZIONE ---
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
    res.send('🚀 Backend PeekBox v2 attivo — GPS + Profili!');
});

// ─────────────────────────────────────────────
// UTENTI
// ─────────────────────────────────────────────

app.post('/api/registrazione', async (req, res) => {
    const { username, email, password, tipo_profilo = 'personal' } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
    if (!['personal', 'business'].includes(tipo_profilo))
        return res.status(400).json({ error: "tipo_profilo non valido. Usa 'personal' o 'business'." });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO utenti (username, email, password, tipo_profilo) VALUES (?, ?, ?, ?)';
        db.run(sql, [username, email, hashedPassword, tipo_profilo], function(err) {
            if (err) return res.status(400).json({ error: "Email già registrata." });
            res.status(201).json({ id: this.lastID, message: "Utente creato!", tipo_profilo });
        });
    } catch (error) { res.status(500).json({ error: "Errore server." }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email e password sono obbligatorie." });
    db.get('SELECT * FROM utenti WHERE email = ?', [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Credenziali non valide." });
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user.id, email: user.email, tipo_profilo: user.tipo_profilo }, SECRET_KEY, { expiresIn: '24h' });
            res.json({
                message: "Accesso eseguito!",
                token,
                user: { id: user.id, username: user.username, email: user.email, tipo_profilo: user.tipo_profilo }
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide." });
        }
    });
});

app.put('/api/utenti/:id/profilo', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.id))
        return res.status(403).json({ error: "Non autorizzato." });
    const { tipo_profilo } = req.body;
    if (!['personal', 'business'].includes(tipo_profilo))
        return res.status(400).json({ error: "tipo_profilo non valido." });
    db.run('UPDATE utenti SET tipo_profilo = ? WHERE id = ?', [tipo_profilo, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Profilo aggiornato!", tipo_profilo });
    });
});

// ─────────────────────────────────────────────
// ARMADI
// ─────────────────────────────────────────────

app.get('/api/armadi/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId))
        return res.status(403).json({ error: "Non autorizzato." });
    db.all('SELECT * FROM armadi WHERE rif_utente = ?', [req.params.utenteId], (err, rows) => {
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
    db.run('DELETE FROM armadi WHERE id = ? AND rif_utente = ?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(403).json({ error: "Non autorizzato o armadio non trovato." });
        res.json({ message: "Armadio eliminato!" });
    });
});

// ─────────────────────────────────────────────
// BOX
// ─────────────────────────────────────────────

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
        if (String(row.rif_utente) !== String(req.user.id))
            return res.status(403).json({ error: "Non autorizzato." });
        res.json({ box: row });
    });
});

app.get('/api/box/:utenteId', verificaToken, (req, res) => {
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
    const { nome, rif_armadio, is_preferito, moving_mode = 0 } = req.body;
    db.run('INSERT INTO box (nome, rif_armadio, is_preferito, moving_mode) VALUES (?, ?, ?, ?)',
        [nome, rif_armadio, is_preferito ? 1 : 0, moving_mode ? 1 : 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/box/preferito/:id', verificaToken, (req, res) => {
    const { is_preferito } = req.body;
    db.run('UPDATE box SET is_preferito = ? WHERE id = ?', [is_preferito ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Stato preferito aggiornato!" });
    });
});

app.put('/api/box/moving-mode/:id', verificaToken, (req, res) => {
    const { moving_mode } = req.body;
    const sqlCheck = `
        SELECT box.id FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ?
    `;
    db.get(sqlCheck, [req.params.id, req.user.id], (err, row) => {
        if (err || !row) return res.status(403).json({ error: "Non autorizzato." });
        db.run('UPDATE box SET moving_mode = ? WHERE id = ?', [moving_mode ? 1 : 0, req.params.id], function(runErr) {
            if (runErr) return res.status(500).json({ error: runErr.message });
            res.json({ message: `Moving Mode ${moving_mode ? 'attivato' : 'disattivato'}!`, moving_mode: moving_mode ? 1 : 0 });
        });
    });
});

app.delete('/api/box/:id', verificaToken, (req, res) => {
    const now = new Date().toISOString();
    db.run('UPDATE box SET data_eliminazione = ? WHERE id = ?', [now, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Box spostata nel cestino!" });
    });
});

app.get('/api/box/eliminate/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId))
        return res.status(403).json({ error: "Non autorizzato." });
    const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sql = `
        SELECT box.*, armadi.nome as nome_armadio, COUNT(oggetti.id) as num_oggetti
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

app.delete('/api/box/cestino/pulisci', verificaToken, (req, res) => {
    const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.run('DELETE FROM box WHERE data_eliminazione IS NOT NULL AND data_eliminazione < ?',
        [trentaGiorniFa], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `Rimosse ${this.changes} box scadute.` });
    });
});

// ─────────────────────────────────────────────
// CHECKPOINT GPS
// ─────────────────────────────────────────────

app.post('/api/checkpoint', verificaToken, (req, res) => {
    const { rif_box, latitudine, longitudine, accuratezza, label } = req.body;
    if (!rif_box || latitudine == null || longitudine == null)
        return res.status(400).json({ error: "rif_box, latitudine e longitudine sono obbligatori." });

    const sqlCheck = `
        SELECT box.id, box.moving_mode FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ?
    `;
    db.get(sqlCheck, [rif_box, req.user.id], (err, boxRow) => {
        if (err || !boxRow) return res.status(403).json({ error: "Box non trovata o non autorizzato." });

        const sql = `INSERT INTO checkpoint_gps (rif_box, rif_utente, latitudine, longitudine, accuratezza, label, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
        db.run(sql, [rif_box, req.user.id, latitudine, longitudine, accuratezza || null, label || null], function(runErr) {
            if (runErr) return res.status(500).json({ error: runErr.message });
            res.status(201).json({ id: this.lastID, message: "Checkpoint salvato!" });
        });
    });
});

app.get('/api/checkpoint/:boxId', verificaToken, (req, res) => {
    const sqlCheck = `
        SELECT box.id FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ?
    `;
    db.get(sqlCheck, [req.params.boxId, req.user.id], (err, row) => {
        if (err || !row) return res.status(403).json({ error: "Non autorizzato." });
        db.all(
            'SELECT * FROM checkpoint_gps WHERE rif_box = ? ORDER BY timestamp ASC',
            [req.params.boxId],
            (fetchErr, rows) => {
                if (fetchErr) return res.status(500).json({ error: fetchErr.message });
                res.json({ checkpoints: rows });
            }
        );
    });
});

app.get('/api/checkpoint/:boxId/ultimo', verificaToken, (req, res) => {
    const sqlCheck = `
        SELECT box.id FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ?
    `;
    db.get(sqlCheck, [req.params.boxId, req.user.id], (err, row) => {
        if (err || !row) return res.status(403).json({ error: "Non autorizzato." });
        db.get(
            'SELECT * FROM checkpoint_gps WHERE rif_box = ? ORDER BY timestamp DESC LIMIT 1',
            [req.params.boxId],
            (fetchErr, checkpoint) => {
                if (fetchErr) return res.status(500).json({ error: fetchErr.message });
                res.json({ checkpoint: checkpoint || null });
            }
        );
    });
});

app.get('/api/dashboard/business/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId))
        return res.status(403).json({ error: "Non autorizzato." });
    if (req.user.tipo_profilo !== 'business')
        return res.status(403).json({ error: "Riservato ai profili Business." });

    const sql = `
        SELECT box.id, box.nome, box.moving_mode, armadi.nome as nome_armadio,
               COUNT(oggetti.id) as num_oggetti,
               gps.latitudine as last_lat,
               gps.longitudine as last_lng,
               gps.timestamp as last_scan,
               gps.label as last_label
        FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        LEFT JOIN oggetti ON oggetti.rif_box = box.id
        LEFT JOIN (
            SELECT rif_box, latitudine, longitudine, timestamp, label
            FROM checkpoint_gps c1
            WHERE timestamp = (
                SELECT MAX(timestamp) FROM checkpoint_gps c2 WHERE c2.rif_box = c1.rif_box
            )
        ) gps ON gps.rif_box = box.id
        WHERE armadi.rif_utente = ?
          AND box.data_eliminazione IS NULL
        GROUP BY box.id
        ORDER BY gps.timestamp DESC
    `;
    db.all(sql, [req.params.utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ assets: rows });
    });
});

app.delete('/api/checkpoint/:boxId', verificaToken, (req, res) => {
    const sqlCheck = `
        SELECT box.id FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ?
    `;
    db.get(sqlCheck, [req.params.boxId, req.user.id], (err, row) => {
        if (err || !row) return res.status(403).json({ error: "Non autorizzato." });
        db.run('DELETE FROM checkpoint_gps WHERE rif_box = ?', [req.params.boxId], function(runErr) {
            if (runErr) return res.status(500).json({ error: runErr.message });
            res.json({ message: `Rimossi ${this.changes} checkpoint.` });
        });
    });
});

// ─────────────────────────────────────────────
// OGGETTI
// ─────────────────────────────────────────────

app.get('/api/oggetti/:boxId', verificaToken, (req, res) => {
    db.all('SELECT * FROM oggetti WHERE rif_box = ?', [req.params.boxId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ oggetti: rows });
    });
});

app.post('/api/oggetti', verificaToken, (req, res) => {
    const { nome, descrizione, tipo, fragile, quantita, foto, rif_box } = req.body;
    db.run(`INSERT INTO oggetti (nome, descrizione, tipo, fragile, quantita, foto, rif_box) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nome, descrizione, tipo, fragile ? 1 : 0, quantita || 1, foto, rif_box], function(err) {
        if (err) return res.status(500).json({ error: "Errore salvataggio." });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/oggetti/:id', verificaToken, (req, res) => {
    const { nome, descrizione, tipo, fragile, quantita, foto } = req.body;
    db.run(`UPDATE oggetti SET nome = ?, descrizione = ?, tipo = ?, fragile = ?, quantita = ?, foto = ? WHERE id = ?`,
        [nome, descrizione, tipo, fragile ? 1 : 0, quantita || 1, foto, req.params.id], function(err) {
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

// ─────────────────────────────────────────────
// TRANSIT ZONE — Spostamento oggetti tra box
// ─────────────────────────────────────────────

/**
 * Sposta uno o più oggetti da una box di origine a una box di destinazione.
 * Body: { oggetti_ids: number[], box_destinazione_id: number }
 * Verifica che sia la box origine che quella destinazione appartengano
 * all'utente autenticato prima di eseguire l'UPDATE.
 */
app.put('/api/oggetti/sposta', verificaToken, (req, res) => {
    const { oggetti_ids, box_destinazione_id } = req.body;

    if (!Array.isArray(oggetti_ids) || oggetti_ids.length === 0 || !box_destinazione_id) {
        return res.status(400).json({ error: "oggetti_ids (array) e box_destinazione_id sono obbligatori." });
    }

    // Verifica che la box destinazione appartenga all'utente
    const sqlCheckDest = `
        SELECT box.id FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ? AND box.data_eliminazione IS NULL
    `;
    db.get(sqlCheckDest, [box_destinazione_id, req.user.id], (err, destRow) => {
        if (err || !destRow) {
            return res.status(403).json({ error: "Box destinazione non trovata o non autorizzata." });
        }

        // Verifica che tutti gli oggetti appartengano a box dell'utente
        const placeholders = oggetti_ids.map(() => '?').join(',');
        const sqlCheckOggetti = `
            SELECT oggetti.id FROM oggetti
            JOIN box ON oggetti.rif_box = box.id
            JOIN armadi ON box.rif_armadio = armadi.id
            WHERE oggetti.id IN (${placeholders}) AND armadi.rif_utente = ?
        `;
        db.all(sqlCheckOggetti, [...oggetti_ids, req.user.id], (errO, oggettiAutorizzati) => {
            if (errO) return res.status(500).json({ error: errO.message });
            if (oggettiAutorizzati.length !== oggetti_ids.length) {
                return res.status(403).json({ error: "Alcuni oggetti non appartengono all'utente." });
            }

            // Esegui lo spostamento
            const sqlUpdate = `UPDATE oggetti SET rif_box = ? WHERE id IN (${placeholders})`;
            db.run(sqlUpdate, [box_destinazione_id, ...oggetti_ids], function(runErr) {
                if (runErr) return res.status(500).json({ error: runErr.message });
                res.json({
                    message: `${this.changes} oggett${this.changes === 1 ? 'o spostato' : 'i spostati'} con successo.`,
                    spostati: this.changes,
                    box_destinazione_id
                });
            });
        });
    });
});

// ─────────────────────────────────────────────
// EXPORT DATI INVENTARIO
// ─────────────────────────────────────────────

/**
 * Esporta l'intero inventario dell'utente come JSON strutturato.
 * GET /api/export/json/:utenteId
 * Restituisce armadi → box → oggetti in formato annidato.
 */
app.get('/api/export/json/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId))
        return res.status(403).json({ error: "Non autorizzato." });

    const sql = `
        SELECT
            armadi.id as armadio_id,
            armadi.nome as armadio_nome,
            box.id as box_id,
            box.nome as box_nome,
            box.is_preferito,
            box.moving_mode,
            oggetti.id as oggetto_id,
            oggetti.nome as oggetto_nome,
            oggetti.descrizione,
            oggetti.tipo,
            oggetti.fragile,
            oggetti.quantita
        FROM armadi
        LEFT JOIN box ON box.rif_armadio = armadi.id AND box.data_eliminazione IS NULL
        LEFT JOIN oggetti ON oggetti.rif_box = box.id
        WHERE armadi.rif_utente = ?
        ORDER BY armadi.id, box.id, oggetti.id
    `;

    db.all(sql, [req.params.utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Struttura annidiata armadi → box → oggetti
        const armadiMap = new Map();
        for (const row of rows) {
            if (!armadiMap.has(row.armadio_id)) {
                armadiMap.set(row.armadio_id, { id: row.armadio_id, nome: row.armadio_nome, box: [] });
            }
            const armadio = armadiMap.get(row.armadio_id);

            if (row.box_id == null) continue;

            let boxEntry = armadio.box.find(b => b.id === row.box_id);
            if (!boxEntry) {
                boxEntry = {
                    id: row.box_id,
                    nome: row.box_nome,
                    is_preferito: row.is_preferito === 1,
                    moving_mode: row.moving_mode === 1,
                    oggetti: []
                };
                armadio.box.push(boxEntry);
            }

            if (row.oggetto_id != null) {
                boxEntry.oggetti.push({
                    id: row.oggetto_id,
                    nome: row.oggetto_nome,
                    descrizione: row.descrizione || '',
                    tipo: row.tipo,
                    fragile: row.fragile === 1,
                    quantita: row.quantita
                });
            }
        }

        const exportData = {
            esportato_il: new Date().toISOString(),
            utente_id: req.params.utenteId,
            armadi: Array.from(armadiMap.values())
        };

        res.setHeader('Content-Disposition', `attachment; filename="peekbox-inventario-${req.params.utenteId}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
    });
});

/**
 * Esporta l'inventario come CSV flat (una riga per oggetto).
 * GET /api/export/csv/:utenteId
 */
app.get('/api/export/csv/:utenteId', verificaToken, (req, res) => {
    if (String(req.user.id) !== String(req.params.utenteId))
        return res.status(403).json({ error: "Non autorizzato." });

    const sql = `
        SELECT
            armadi.nome as Armadio,
            box.nome as Box,
            box.is_preferito as Preferito,
            oggetti.nome as Oggetto,
            oggetti.tipo as Categoria,
            oggetti.descrizione as Descrizione,
            oggetti.quantita as Quantita,
            oggetti.fragile as Fragile
        FROM armadi
        JOIN box ON box.rif_armadio = armadi.id AND box.data_eliminazione IS NULL
        JOIN oggetti ON oggetti.rif_box = box.id
        WHERE armadi.rif_utente = ?
        ORDER BY armadi.nome, box.nome, oggetti.nome
    `;

    db.all(sql, [req.params.utenteId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const headers = ['Armadio', 'Box', 'Preferito', 'Oggetto', 'Categoria', 'Descrizione', 'Quantita', 'Fragile'];
        const escape = (v) => {
            const s = String(v === null || v === undefined ? '' : v);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };

        const lines = [headers.join(',')];
        for (const row of rows) {
            lines.push(headers.map(h => {
                const val = row[h];
                if (h === 'Fragile' || h === 'Preferito') return val === 1 ? 'Sì' : 'No';
                return escape(val);
            }).join(','));
        }

        const csv = lines.join('\r\n');
        res.setHeader('Content-Disposition', `attachment; filename="peekbox-inventario-${req.params.utenteId}.csv"`);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send('\uFEFF' + csv); // BOM UTF-8 per Excel
    });
});

/**
 * Restituisce i dati completi di una box con tutti gli oggetti,
 * pronti per la generazione del PDF etichette lato client.
 * GET /api/export/etichette/:boxId
 */
app.get('/api/export/etichette/:boxId', verificaToken, (req, res) => {
    // Verifica proprietà box
    const sqlCheck = `
        SELECT box.id, box.nome, armadi.nome as nome_armadio, armadi.rif_utente
        FROM box
        JOIN armadi ON box.rif_armadio = armadi.id
        WHERE box.id = ? AND armadi.rif_utente = ?
    `;
    db.get(sqlCheck, [req.params.boxId, req.user.id], (err, boxRow) => {
        if (err || !boxRow) return res.status(403).json({ error: "Non autorizzato." });

        db.all('SELECT * FROM oggetti WHERE rif_box = ? ORDER BY nome', [req.params.boxId], (errO, oggetti) => {
            if (errO) return res.status(500).json({ error: errO.message });
            res.json({
                box: { id: boxRow.id, nome: boxRow.nome, armadio: boxRow.nome_armadio },
                oggetti: oggetti || []
            });
        });
    });
});

// ─────────────────────────────────────────────
// RICERCA
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// TIPOLOGIE
// ─────────────────────────────────────────────

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
