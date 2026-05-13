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

// ─────────────────────────────────────────────
// CONDIVISIONI ARCHIVIO — RBAC (Role-Based Access Control)
// ─────────────────────────────────────────────

/**
 * Helper: verifica che l'utente sia il proprietario dell'armadio
 * oppure un ospite con almeno il ruolo indicato.
 * Risolve con { isOwner, ruolo } oppure respinge con 403.
 */
function verificaAccessoArmadio(armadioId, userId, ruoloMinimo, res, cb) {
  db.get('SELECT rif_utente FROM armadi WHERE id = ?', [armadioId], (err, armadio) => {
    if (err || !armadio) return res.status(404).json({ error: "Armadio non trovato." });

    if (String(armadio.rif_utente) === String(userId)) {
      return cb({ isOwner: true, ruolo: 'owner' });
    }

    db.get(
      'SELECT ruolo FROM condivisioni_armadio WHERE rif_armadio = ? AND rif_ospite = ?',
      [armadioId, userId],
      (e2, row) => {
        if (e2 || !row) return res.status(403).json({ error: "Accesso negato." });
        const livelli = ['viewer', 'editor'];
        if (livelli.indexOf(row.ruolo) < livelli.indexOf(ruoloMinimo)) {
          return res.status(403).json({ error: `Ruolo insufficiente. Richiesto: ${ruoloMinimo}.` });
        }
        cb({ isOwner: false, ruolo: row.ruolo });
      }
    );
  });
}

/**
 * Condividi un armadio con un altro utente (per email).
 * Solo il proprietario può farlo.
 * POST /api/condivisioni
 * Body: { armadio_id, email_ospite, ruolo }
 */
app.post('/api/condivisioni', verificaToken, (req, res) => {
  const { armadio_id, email_ospite, ruolo = 'viewer' } = req.body;
  if (!armadio_id || !email_ospite) {
    return res.status(400).json({ error: "armadio_id e email_ospite sono obbligatori." });
  }
  if (!['viewer', 'editor'].includes(ruolo)) {
    return res.status(400).json({ error: "ruolo non valido. Usa 'viewer' o 'editor'." });
  }

  // Verifica proprietà
  db.get('SELECT id FROM armadi WHERE id = ? AND rif_utente = ?', [armadio_id, req.user.id], (err, armadio) => {
    if (err || !armadio) return res.status(403).json({ error: "Non sei il proprietario di questo archivio." });

    // Trova l'ospite per email
    db.get('SELECT id, username FROM utenti WHERE email = ?', [email_ospite], (e2, ospite) => {
      if (e2 || !ospite) return res.status(404).json({ error: "Utente non trovato con quella email." });
      if (ospite.id === req.user.id) return res.status(400).json({ error: "Non puoi condividere con te stesso." });

      db.run(
        `INSERT INTO condivisioni_armadio (rif_armadio, rif_proprietario, rif_ospite, ruolo)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(rif_armadio, rif_ospite) DO UPDATE SET ruolo = excluded.ruolo`,
        [armadio_id, req.user.id, ospite.id, ruolo],
        function (e3) {
          if (e3) return res.status(500).json({ error: e3.message });
          res.status(201).json({
            message: `Archivio condiviso con ${ospite.username} come ${ruolo}.`,
            id: this.lastID,
            ospite: { id: ospite.id, username: ospite.username },
            ruolo
          });
        }
      );
    });
  });
});

/**
 * Elenca tutti gli accessi condivisi di un armadio (solo proprietario).
 * GET /api/condivisioni/:armadioId
 */
app.get('/api/condivisioni/:armadioId', verificaToken, (req, res) => {
  db.get('SELECT id FROM armadi WHERE id = ? AND rif_utente = ?', [req.params.armadioId, req.user.id], (err, row) => {
    if (err || !row) return res.status(403).json({ error: "Non sei il proprietario." });

    const sql = `
      SELECT c.id, c.ruolo, c.creato_il,
             u.id as ospite_id, u.username as ospite_username, u.email as ospite_email
      FROM condivisioni_armadio c
      JOIN utenti u ON u.id = c.rif_ospite
      WHERE c.rif_armadio = ?
      ORDER BY c.creato_il DESC
    `;
    db.all(sql, [req.params.armadioId], (e2, rows) => {
      if (e2) return res.status(500).json({ error: e2.message });
      res.json({ condivisioni: rows });
    });
  });
});

/**
 * Elenca tutti gli archivi a cui l'utente ha accesso come ospite.
 * GET /api/condivisioni/ricevute/:utenteId
 */
app.get('/api/condivisioni/ricevute/:utenteId', verificaToken, (req, res) => {
  if (String(req.user.id) !== String(req.params.utenteId))
    return res.status(403).json({ error: "Non autorizzato." });

  const sql = `
    SELECT c.id as condivisione_id, c.ruolo, c.creato_il,
           a.id as armadio_id, a.nome as armadio_nome,
           u.username as proprietario_username, u.email as proprietario_email
    FROM condivisioni_armadio c
    JOIN armadi a ON a.id = c.rif_armadio
    JOIN utenti u ON u.id = c.rif_proprietario
    WHERE c.rif_ospite = ?
    ORDER BY c.creato_il DESC
  `;
  db.all(sql, [req.params.utenteId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ archivi_condivisi: rows });
  });
});

/**
 * Revoca una condivisione (solo il proprietario).
 * DELETE /api/condivisioni/:id
 */
app.delete('/api/condivisioni/:id', verificaToken, (req, res) => {
  db.run(
    'DELETE FROM condivisioni_armadio WHERE id = ? AND rif_proprietario = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(403).json({ error: "Condivisione non trovata o non autorizzato." });
      res.json({ message: "Condivisione revocata." });
    }
  );
});

/**
 * Accede alle box di un archivio condiviso (viewer o editor).
 * GET /api/condivisioni/armadio/:armadioId/box
 */
app.get('/api/condivisioni/armadio/:armadioId/box', verificaToken, (req, res) => {
  verificaAccessoArmadio(req.params.armadioId, req.user.id, 'viewer', res, ({ ruolo }) => {
    const sql = `
      SELECT box.*, COUNT(oggetti.id) as num_oggetti
      FROM box
      LEFT JOIN oggetti ON oggetti.rif_box = box.id
      WHERE box.rif_armadio = ? AND box.data_eliminazione IS NULL
      GROUP BY box.id
    `;
    db.all(sql, [req.params.armadioId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ box: rows, ruolo_corrente: ruolo });
    });
  });
});

/**
 * Accede agli oggetti di una box in un archivio condiviso (viewer o editor).
 * GET /api/condivisioni/box/:boxId/oggetti
 */
app.get('/api/condivisioni/box/:boxId/oggetti', verificaToken, (req, res) => {
  db.get('SELECT rif_armadio FROM box WHERE id = ?', [req.params.boxId], (err, box) => {
    if (err || !box) return res.status(404).json({ error: "Box non trovata." });

    verificaAccessoArmadio(box.rif_armadio, req.user.id, 'viewer', res, ({ ruolo }) => {
      db.all('SELECT * FROM oggetti WHERE rif_box = ?', [req.params.boxId], (e2, rows) => {
        if (e2) return res.status(500).json({ error: e2.message });
        res.json({ oggetti: rows, ruolo_corrente: ruolo });
      });
    });
  });
});

// ─────────────────────────────────────────────
// GEOFENCING — Perimetro di Sicurezza Virtuale
// ─────────────────────────────────────────────

/**
 * Calcolo distanza geodetica con formula di Haversine.
 * Ritorna la distanza in metri tra due coordinate GPS.
 */
function haversineMetri(lat1, lng1, lat2, lng2) {
  const R = 6371000; // raggio terrestre in metri
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Crea o aggiorna il geofence di un armadio (solo proprietario).
 * POST /api/geofence
 * Body: { armadio_id, latitudine, longitudine, raggio_m, attivo }
 */
app.post('/api/geofence', verificaToken, (req, res) => {
  const { armadio_id, latitudine, longitudine, raggio_m = 100, attivo = 1 } = req.body;
  if (!armadio_id || latitudine == null || longitudine == null) {
    return res.status(400).json({ error: "armadio_id, latitudine e longitudine sono obbligatori." });
  }

  db.get('SELECT id FROM armadi WHERE id = ? AND rif_utente = ?', [armadio_id, req.user.id], (err, row) => {
    if (err || !row) return res.status(403).json({ error: "Non sei il proprietario di questo archivio." });

    db.run(
      `INSERT INTO geofence (rif_armadio, latitudine, longitudine, raggio_m, attivo)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(rif_armadio) DO UPDATE SET
         latitudine = excluded.latitudine,
         longitudine = excluded.longitudine,
         raggio_m = excluded.raggio_m,
         attivo = excluded.attivo`,
      [armadio_id, latitudine, longitudine, raggio_m, attivo ? 1 : 0],
      function (e2) {
        if (e2) return res.status(500).json({ error: e2.message });
        res.status(201).json({
          message: "Geofence impostato.",
          id: this.lastID || null,
          armadio_id, latitudine, longitudine, raggio_m, attivo: attivo ? 1 : 0
        });
      }
    );
  });
});

/**
 * Legge il geofence di un armadio.
 * GET /api/geofence/:armadioId
 */
app.get('/api/geofence/:armadioId', verificaToken, (req, res) => {
  verificaAccessoArmadio(req.params.armadioId, req.user.id, 'viewer', res, () => {
    db.get('SELECT * FROM geofence WHERE rif_armadio = ?', [req.params.armadioId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ geofence: row || null });
    });
  });
});

/**
 * Elimina il geofence di un armadio (solo proprietario).
 * DELETE /api/geofence/:armadioId
 */
app.delete('/api/geofence/:armadioId', verificaToken, (req, res) => {
  db.get('SELECT id FROM armadi WHERE id = ? AND rif_utente = ?', [req.params.armadioId, req.user.id], (err, row) => {
    if (err || !row) return res.status(403).json({ error: "Non sei il proprietario." });
    db.run('DELETE FROM geofence WHERE rif_armadio = ?', [req.params.armadioId], function (e2) {
      if (e2) return res.status(500).json({ error: e2.message });
      res.json({ message: "Geofence rimosso." });
    });
  });
});

/**
 * Verifica la posizione di un asset rispetto al geofence del suo armadio.
 * Se l'asset risulta fuori dal perimetro, restituisce un'eccezione di sicurezza.
 * POST /api/geofence/verifica
 * Body: { box_id, latitudine, longitudine }
 */
app.post('/api/geofence/verifica', verificaToken, (req, res) => {
  const { box_id, latitudine, longitudine } = req.body;
  if (!box_id || latitudine == null || longitudine == null) {
    return res.status(400).json({ error: "box_id, latitudine e longitudine sono obbligatori." });
  }

  // Recupera l'armadio della box e verifica accesso
  const sqlBox = `
    SELECT box.id, box.nome, box.rif_armadio, armadi.rif_utente
    FROM box
    JOIN armadi ON box.rif_armadio = armadi.id
    WHERE box.id = ?
  `;
  db.get(sqlBox, [box_id], (err, box) => {
    if (err || !box) return res.status(404).json({ error: "Box non trovata." });

    // Accesso: proprietario o ospite con ruolo viewer+
    verificaAccessoArmadio(box.rif_armadio, req.user.id, 'viewer', res, () => {
      db.get('SELECT * FROM geofence WHERE rif_armadio = ? AND attivo = 1', [box.rif_armadio], (e2, fence) => {
        if (e2) return res.status(500).json({ error: e2.message });

        if (!fence) {
          return res.json({ geofence_attivo: false, message: "Nessun geofence configurato per questo archivio." });
        }

        const distanza = haversineMetri(fence.latitudine, fence.longitudine, latitudine, longitudine);
        const dentro = distanza <= fence.raggio_m;

        const risultato = {
          geofence_attivo: true,
          box_id: box.id,
          box_nome: box.nome,
          distanza_m: Math.round(distanza),
          raggio_m: fence.raggio_m,
          dentro_perimetro: dentro,
          posizione_rilevata: { latitudine, longitudine },
          centro_geofence: { latitudine: fence.latitudine, longitudine: fence.longitudine }
        };

        if (!dentro) {
          // ⚠️ ECCEZIONE DI SICUREZZA — asset fuori perimetro
          risultato.alert = {
            livello: 'SECURITY_EXCEPTION',
            messaggio: `⚠️ ALERT: "${box.nome}" rilevata a ${Math.round(distanza)} m dal perimetro autorizzato (raggio: ${fence.raggio_m} m). Possibile movimentazione non autorizzata.`,
            timestamp: new Date().toISOString()
          };
          return res.status(200).json(risultato);
        }

        res.json(risultato);
      });
    });
  });
});

/**
 * Verifica automatica geofence al momento della registrazione di un checkpoint GPS.
 * Sostituisce POST /api/checkpoint con la logica di controllo integrata.
 * POST /api/checkpoint/sicuro
 * Body: { rif_box, latitudine, longitudine, accuratezza?, label? }
 */
app.post('/api/checkpoint/sicuro', verificaToken, (req, res) => {
  const { rif_box, latitudine, longitudine, accuratezza, label } = req.body;
  if (!rif_box || latitudine == null || longitudine == null)
    return res.status(400).json({ error: "rif_box, latitudine e longitudine sono obbligatori." });

  const sqlCheck = `
    SELECT box.id, box.moving_mode, box.rif_armadio FROM box
    JOIN armadi ON box.rif_armadio = armadi.id
    WHERE box.id = ? AND armadi.rif_utente = ?
  `;
  db.get(sqlCheck, [rif_box, req.user.id], (err, boxRow) => {
    if (err || !boxRow) return res.status(403).json({ error: "Box non trovata o non autorizzato." });

    // Salva il checkpoint
    const sqlInsert = `INSERT INTO checkpoint_gps (rif_box, rif_utente, latitudine, longitudine, accuratezza, label, timestamp)
                       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    db.run(sqlInsert, [rif_box, req.user.id, latitudine, longitudine, accuratezza || null, label || null], function(runErr) {
      if (runErr) return res.status(500).json({ error: runErr.message });

      const checkpointId = this.lastID;

      // Controllo geofence se attivo per l'armadio
      db.get('SELECT * FROM geofence WHERE rif_armadio = ? AND attivo = 1', [boxRow.rif_armadio], (e2, fence) => {
        if (e2 || !fence) {
          return res.status(201).json({ id: checkpointId, message: "Checkpoint salvato.", geofence_alert: null });
        }

        const distanza = haversineMetri(fence.latitudine, fence.longitudine, latitudine, longitudine);
        const dentro = distanza <= fence.raggio_m;

        const geofence_alert = dentro ? null : {
          livello: 'SECURITY_EXCEPTION',
          messaggio: `⚠️ Asset fuori perimetro: ${Math.round(distanza)} m (raggio autorizzato: ${fence.raggio_m} m).`,
          distanza_m: Math.round(distanza),
          raggio_m: fence.raggio_m,
          timestamp: new Date().toISOString()
        };

        res.status(201).json({
          id: checkpointId,
          message: "Checkpoint salvato.",
          dentro_perimetro: dentro,
          geofence_alert
        });
      });
    });
  });
});

app.listen(PORT, () => {
    console.log(`🚀 SERVER ATTIVO: http://localhost:${PORT}`);
});
