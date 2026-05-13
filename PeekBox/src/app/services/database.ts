import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private backendPort = 3000;
  private get apiUrl(): string {
    // Usa sempre l'IP/host con cui il browser ha raggiunto questa app,
    // ma punta alla porta del backend (3000). Funziona sia su localhost che su IP locale.
    return `${window.location.protocol}//${window.location.hostname}:${this.backendPort}/api`;
  }

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  async initPlugin() {
    console.log('✅ Service pronto a comunicare con il Backend');
  }

  // ─── AUTENTICAZIONE ───────────────────────────────────────

  registraUtente(username: string, email: string, pass: string, tipo_profilo: 'personal' | 'business' = 'personal') {
    return this.http.post(`${this.apiUrl}/registrazione`, {
      username, email, password: pass, tipo_profilo
    });
  }

  loginUtente(email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/login`, { email, password: pass });
  }

  aggiornaTipoProfilo(utenteId: string, tipo_profilo: 'personal' | 'business') {
    return this.http.put(`${this.apiUrl}/utenti/${utenteId}/profilo`,
      { tipo_profilo }, { headers: this.getAuthHeaders() });
  }

  // ─── ARMADI ───────────────────────────────────────────────

  getArmadi(utenteId: string) {
    return this.http.get(`${this.apiUrl}/armadi/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  creaArmadio(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/armadi`, { nome, rif_utente: utenteId }, { headers: this.getAuthHeaders() });
  }

  eliminaArmadio(id: number) {
    return this.http.delete(`${this.apiUrl}/armadi/${id}`, { headers: this.getAuthHeaders() });
  }

  // ─── BOX ──────────────────────────────────────────────────

  getBoxSingola(id: number) {
    return this.http.get(`${this.apiUrl}/box/singola/${id}`, { headers: this.getAuthHeaders() });
  }

  getBox(utenteId: string) {
    return this.http.get(`${this.apiUrl}/box/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  creaBox(nome: string, rif_armadio: string, is_preferito: boolean, moving_mode: boolean = false) {
    return this.http.post(`${this.apiUrl}/box`, { nome, rif_armadio, is_preferito, moving_mode }, { headers: this.getAuthHeaders() });
  }

  updatePreferito(id: number, is_preferito: boolean) {
    return this.http.put(`${this.apiUrl}/box/preferito/${id}`, { is_preferito }, { headers: this.getAuthHeaders() });
  }

  updateMovingMode(id: number, moving_mode: boolean) {
    return this.http.put(`${this.apiUrl}/box/moving-mode/${id}`, { moving_mode }, { headers: this.getAuthHeaders() });
  }

  eliminaBox(id: number) {
    return this.http.delete(`${this.apiUrl}/box/${id}`, { headers: this.getAuthHeaders() });
  }

  getBoxEliminate(utenteId: string) {
    return this.http.get(`${this.apiUrl}/box/eliminate/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  // ─── CHECKPOINT GPS ───────────────────────────────────────

  salvaCheckpoint(rif_box: number, latitudine: number, longitudine: number, accuratezza?: number, label?: string) {
    return this.http.post(`${this.apiUrl}/checkpoint`, {
      rif_box, latitudine, longitudine, accuratezza, label
    }, { headers: this.getAuthHeaders() });
  }

  getCheckpoints(boxId: number) {
    return this.http.get(`${this.apiUrl}/checkpoint/${boxId}`, { headers: this.getAuthHeaders() });
  }

  getUltimoCheckpoint(boxId: number) {
    return this.http.get(`${this.apiUrl}/checkpoint/${boxId}/ultimo`, { headers: this.getAuthHeaders() });
  }

  eliminaCheckpoints(boxId: number) {
    return this.http.delete(`${this.apiUrl}/checkpoint/${boxId}`, { headers: this.getAuthHeaders() });
  }

  /** Smart QR — ottiene o genera il token pubblico per la box */
  getQrToken(boxId: number) {
    return this.http.post(`${this.apiUrl}/box/${boxId}/qr-token`, {}, { headers: this.getAuthHeaders() });
  }

  /** Costruisce l'URL pubblico del QR usando l'IP/host corrente del browser */
  buildQrUrl(boxId: number, token: string): string {
    const base = `${window.location.protocol}//${window.location.hostname}:${this.backendPort}`;
    return `${base}/scan?box=${boxId}&t=${token}`;
  }

  // ─── DASHBOARD BUSINESS ───────────────────────────────────

  getDashboardBusiness(utenteId: string) {
    return this.http.get(`${this.apiUrl}/dashboard/business/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  // ─── OGGETTI ──────────────────────────────────────────────

  getOggettiPerBox(boxId: number) {
    return this.http.get(`${this.apiUrl}/oggetti/${boxId}`, { headers: this.getAuthHeaders() });
  }

  creaOggetto(dati: any) {
    return this.http.post(`${this.apiUrl}/oggetti`, dati, { headers: this.getAuthHeaders() });
  }

  aggiornaOggetto(id: number, dati: any) {
    return this.http.put(`${this.apiUrl}/oggetti/${id}`, dati, { headers: this.getAuthHeaders() });
  }

  eliminaOggetto(id: number) {
    return this.http.delete(`${this.apiUrl}/oggetti/${id}`, { headers: this.getAuthHeaders() });
  }

  // ─── TRANSIT ZONE — Spostamento oggetti ───────────────────

  /**
   * Sposta uno o più oggetti in una box di destinazione.
   * Usato dalla Transit Zone per sincronizzare con il DB dopo il drag & drop.
   */
  spostaOggetti(oggettiIds: number[], boxDestinazioneId: number) {
    return this.http.put(
      `${this.apiUrl}/oggetti/sposta`,
      { oggetti_ids: oggettiIds, box_destinazione_id: boxDestinazioneId },
      { headers: this.getAuthHeaders() }
    );
  }

  // ─── TIPOLOGIE ────────────────────────────────────────────

  getTipologie(utenteId: string) {
    return this.http.get(`${this.apiUrl}/tipologie/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  creaTipologia(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/tipologie`, { nome, rif_utente: utenteId }, { headers: this.getAuthHeaders() });
  }

  eliminaTipologia(id: number) {
    return this.http.delete(`${this.apiUrl}/tipologie/${id}`, { headers: this.getAuthHeaders() });
  }

  // ─── RICERCA ──────────────────────────────────────────────

  cercaOggetti(utenteId: string, termine: string) {
    return this.http.get(
      `${this.apiUrl}/cerca/${utenteId}?q=${encodeURIComponent(termine)}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ─── CONDIVISIONI ARCHIVIO (RBAC) ─────────────────────────

  /**
   * Condividi un archivio con un utente tramite email.
   * ruolo: 'viewer' | 'editor'
   */
  condividiArchivio(armadio_id: number, email_ospite: string, ruolo: 'viewer' | 'editor') {
    return this.http.post(`${this.apiUrl}/condivisioni`,
      { armadio_id, email_ospite, ruolo }, { headers: this.getAuthHeaders() });
  }

  /** Elenca le condivisioni attive di un archivio (proprietario). */
  getCondivisioniArchivio(armadioId: number) {
    return this.http.get(`${this.apiUrl}/condivisioni/${armadioId}`,
      { headers: this.getAuthHeaders() });
  }

  /** Archiviazioni ricevute dall'utente come ospite. */
  getArchividCondivisiConMe(utenteId: string) {
    return this.http.get(`${this.apiUrl}/condivisioni/ricevute/${utenteId}`,
      { headers: this.getAuthHeaders() });
  }

  /** Revoca una condivisione per id (solo proprietario). */
  revocaCondivisione(condivisioneId: number) {
    return this.http.delete(`${this.apiUrl}/condivisioni/${condivisioneId}`,
      { headers: this.getAuthHeaders() });
  }

  /** Legge le box di un archivio condiviso (viewer+). */
  getBoxArchivioCondiviso(armadioId: number) {
    return this.http.get(`${this.apiUrl}/condivisioni/armadio/${armadioId}/box`,
      { headers: this.getAuthHeaders() });
  }

  /** Legge gli oggetti di una box in un archivio condiviso (viewer+). */
  getOggettiBoxCondivisa(boxId: number) {
    return this.http.get(`${this.apiUrl}/condivisioni/box/${boxId}/oggetti`,
      { headers: this.getAuthHeaders() });
  }

  // ─── GEOFENCING ───────────────────────────────────────────

  /** Crea o aggiorna il geofence di un armadio. */
  impostaGeofence(armadio_id: number, latitudine: number, longitudine: number, raggio_m: number = 100, attivo: boolean = true) {
    return this.http.post(`${this.apiUrl}/geofence`,
      { armadio_id, latitudine, longitudine, raggio_m, attivo },
      { headers: this.getAuthHeaders() });
  }

  /** Legge il geofence di un armadio. */
  getGeofence(armadioId: number) {
    return this.http.get(`${this.apiUrl}/geofence/${armadioId}`,
      { headers: this.getAuthHeaders() });
  }

  /** Elimina il geofence di un armadio. */
  eliminaGeofence(armadioId: number) {
    return this.http.delete(`${this.apiUrl}/geofence/${armadioId}`,
      { headers: this.getAuthHeaders() });
  }

  /**
   * Verifica se una posizione GPS è dentro il geofence della box.
   * Se fuori perimetro, la risposta include geofence_alert con l'eccezione di sicurezza.
   */
  verificaGeofence(box_id: number, latitudine: number, longitudine: number) {
    return this.http.post(`${this.apiUrl}/geofence/verifica`,
      { box_id, latitudine, longitudine },
      { headers: this.getAuthHeaders() });
  }

  /**
   * Salva un checkpoint GPS con controllo geofence automatico integrato.
   * Usa questo al posto di salvaCheckpoint quando il geofencing è abilitato.
   */
  salvaCheckpointSicuro(rif_box: number, latitudine: number, longitudine: number, accuratezza?: number, label?: string) {
    return this.http.post(`${this.apiUrl}/checkpoint/sicuro`,
      { rif_box, latitudine, longitudine, accuratezza, label },
      { headers: this.getAuthHeaders() });
  }

  // ─── EXPORT ───────────────────────────────────────────────

  /**
   * Recupera i dati JSON completi per l'export dell'inventario.
   * Il download viene gestito lato client da ExportService.
   */
  getExportJson(utenteId: string) {
    return this.http.get(`${this.apiUrl}/export/json/${utenteId}`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Recupera il CSV dell'inventario.
   */
  getExportCsv(utenteId: string) {
    return this.http.get(`${this.apiUrl}/export/csv/${utenteId}`, {
      headers: this.getAuthHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Recupera i dati di una singola box con oggetti per la generazione
   * del PDF etichette lato client.
   */
  getEtichetteBox(boxId: number) {
    return this.http.get(`${this.apiUrl}/export/etichette/${boxId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
