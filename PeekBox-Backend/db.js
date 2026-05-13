const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Errore connessione database:", err.message);
  else console.log("✅ Connesso al database SQLite (PeekBox-Backend)");
});

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");

  // 1. Tabella UTENTI — con tipo_profilo ('personal' | 'business')
  db.run(`CREATE TABLE IF NOT EXISTS utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    tipo_profilo TEXT NOT NULL DEFAULT 'personal'
  )`);

  // Migrazione: aggiunge tipo_profilo se il database esiste già
  db.run(`ALTER TABLE utenti ADD COLUMN tipo_profilo TEXT NOT NULL DEFAULT 'personal'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error("Migrazione tipo_profilo:", err.message);
    }
  });

  // 2. Tabella ARMADI
  db.run(`CREATE TABLE IF NOT EXISTS armadi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    rif_utente INTEGER,
    FOREIGN KEY(rif_utente) REFERENCES utenti(id) ON DELETE CASCADE
  )`);

  // 3. Tabella BOX — con moving_mode flag
  db.run(`CREATE TABLE IF NOT EXISTS box (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    rif_armadio INTEGER,
    is_preferito INTEGER DEFAULT 0,
    data_eliminazione TEXT DEFAULT NULL,
    moving_mode INTEGER DEFAULT 0,
    FOREIGN KEY(rif_armadio) REFERENCES armadi(id) ON DELETE CASCADE
  )`);

  // Migrazioni box
  db.run(`ALTER TABLE box ADD COLUMN data_eliminazione TEXT DEFAULT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column')) console.error("Migrazione data_eliminazione:", err.message);
  });
  db.run(`ALTER TABLE box ADD COLUMN moving_mode INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) console.error("Migrazione moving_mode:", err.message);
  });

  // 4. Tabella OGGETTI
  db.run(`CREATE TABLE IF NOT EXISTS oggetti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descrizione TEXT,
    tipo TEXT,
    fragile INTEGER DEFAULT 0,
    quantita INTEGER DEFAULT 1,
    foto TEXT,
    rif_box INTEGER,
    FOREIGN KEY(rif_box) REFERENCES box(id) ON DELETE CASCADE
  )`);

  // 5. Tabella TIPOLOGIE
  db.run(`CREATE TABLE IF NOT EXISTS tipologie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    rif_utente INTEGER,
    FOREIGN KEY(rif_utente) REFERENCES utenti(id) ON DELETE CASCADE
  )`);

  // 6. Tabella CHECKPOINT GPS — storico posizioni per ogni scansione QR
  db.run(`CREATE TABLE IF NOT EXISTS checkpoint_gps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rif_box INTEGER NOT NULL,
    rif_utente INTEGER NOT NULL,
    latitudine REAL NOT NULL,
    longitudine REAL NOT NULL,
    accuratezza REAL,
    label TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(rif_box) REFERENCES box(id) ON DELETE CASCADE,
    FOREIGN KEY(rif_utente) REFERENCES utenti(id) ON DELETE CASCADE
  )`);

  // ─────────────────────────────────────────────
  // 7. CONDIVISIONI ARCHIVIO — N:M tra utenti e armadi (RBAC)
  //    ruolo: 'viewer' (sola lettura) | 'editor' (co-gestione)
  // ─────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS condivisioni_armadio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rif_armadio INTEGER NOT NULL,
    rif_proprietario INTEGER NOT NULL,
    rif_ospite INTEGER NOT NULL,
    ruolo TEXT NOT NULL DEFAULT 'viewer',
    creato_il TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(rif_armadio, rif_ospite),
    FOREIGN KEY(rif_armadio) REFERENCES armadi(id) ON DELETE CASCADE,
    FOREIGN KEY(rif_proprietario) REFERENCES utenti(id) ON DELETE CASCADE,
    FOREIGN KEY(rif_ospite) REFERENCES utenti(id) ON DELETE CASCADE
  )`);

  // ─────────────────────────────────────────────
  // 8. GEOFENCE — Perimetro virtuale per armadi/strutture logistiche
  //    raggio_m: raggio di tolleranza in metri (default 100 m)
  // ─────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS geofence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rif_armadio INTEGER NOT NULL UNIQUE,
    latitudine REAL NOT NULL,
    longitudine REAL NOT NULL,
    raggio_m REAL NOT NULL DEFAULT 100,
    attivo INTEGER NOT NULL DEFAULT 1,
    creato_il TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(rif_armadio) REFERENCES armadi(id) ON DELETE CASCADE
  )`);

  // ─────────────────────────────────────────────
  // 9. SMART QR — Token pubblici per Moving Mode
  //    Un token per box, generato all'attivazione
  //    del Moving Mode. Codificato nel QR stampato.
  // ─────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS qr_token (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    rif_box   INTEGER NOT NULL UNIQUE,
    token     TEXT NOT NULL UNIQUE,
    creato_il TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(rif_box) REFERENCES box(id) ON DELETE CASCADE
  )`);

  // ─────────────────────────────────────────────
  // 10. SEGNALAZIONI GUEST — Log tracciamenti pubblici
  //     L'IP viene anonimizzato (SHA-256) per GDPR.
  //     max 10 segnalazioni per box ogni 24h.
  // ─────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS segnalazioni_guest (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    rif_box      INTEGER NOT NULL,
    latitudine   REAL,
    longitudine  REAL,
    accuratezza  REAL,
    nota         TEXT,
    ip_hash      TEXT,
    timestamp    TEXT NOT NULL DEFAULT (datetime('now')),
    notificato   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(rif_box) REFERENCES box(id) ON DELETE CASCADE
  )`);

  console.log("✅ Schema tabelle SQLite pronto (v4 — Smart QR + Segnalazioni Guest).");
  popolaDatiEsempio();
});

async function popolaDatiEsempio() {
  try {
    const saltRounds = 10;
    const hashPassword = await bcrypt.hash('password123', saltRounds);

    db.run(
      `INSERT OR IGNORE INTO utenti (id, username, email, password, tipo_profilo) VALUES (?, ?, ?, ?, ?)`,
      [1, 'Emanuele', 'ema@example.com', hashPassword, 'personal'],
      function(err) {
        if (err) return console.error(err.message);
        if (this.changes > 0) console.log("👤 Utente di prova creato (ema@example.com)");
      }
    );
  } catch (err) {
    console.error("Errore hashing password esempio:", err);
  }
}

module.exports = db;
