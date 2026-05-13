import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = 'http://localhost:3000/api';

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
