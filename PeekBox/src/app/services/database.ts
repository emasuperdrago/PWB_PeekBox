import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Costruisce gli header con il token JWT preso dal localStorage
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  async initPlugin() {
    console.log('✅ Service pronto a comunicare con il Backend');
  }

  // --- AUTENTICAZIONE (nessun header richiesto) ---

  registraUtente(username: string, email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/registrazione`, {
      username, email, password: pass
    });
  }

  loginUtente(email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/login`, {
      email, password: pass
    });
  }

  // --- FUNZIONI PER ARMADI ---

  getArmadi(utenteId: string) {
    return this.http.get(`${this.apiUrl}/armadi/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  creaArmadio(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/armadi`, { nome, rif_utente: utenteId }, { headers: this.getAuthHeaders() });
  }

  eliminaArmadio(id: number) {
    return this.http.delete(`${this.apiUrl}/armadi/${id}`, { headers: this.getAuthHeaders() });
  }

  // --- FUNZIONI PER LE BOX ---

  // FIX BUG 7: Rotta per recuperare i dettagli di una singola box (e il nome armadio)
  getBoxSingola(id: number) {
    return this.http.get(`${this.apiUrl}/box/singola/${id}`, { headers: this.getAuthHeaders() });
  }

  getBox(utenteId: string) {
    return this.http.get(`${this.apiUrl}/box/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  creaBox(nome: string, rif_armadio: string, is_preferito: boolean) {
    return this.http.post(`${this.apiUrl}/box`, { nome, rif_armadio, is_preferito }, { headers: this.getAuthHeaders() });
  }

  updatePreferito(id: number, is_preferito: boolean) {
    return this.http.put(`${this.apiUrl}/box/preferito/${id}`, { is_preferito }, { headers: this.getAuthHeaders() });
  }

  eliminaBox(id: number) {
    return this.http.delete(`${this.apiUrl}/box/${id}`, { headers: this.getAuthHeaders() });
  }

  // --- FUNZIONI PER GLI OGGETTI ---

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

  // --- FUNZIONI PER LE TIPOLOGIE ---

  getTipologie(utenteId: string) {
    return this.http.get(`${this.apiUrl}/tipologie/${utenteId}`, { headers: this.getAuthHeaders() });
  }

  creaTipologia(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/tipologie`, { nome, rif_utente: utenteId }, { headers: this.getAuthHeaders() });
  }

  eliminaTipologia(id: number) {
    return this.http.delete(`${this.apiUrl}/tipologie/${id}`, { headers: this.getAuthHeaders() });
  }

  // --- RICERCA ---

  cercaOggetti(utenteId: string, termine: string) {
    return this.http.get(
      `${this.apiUrl}/cerca/${utenteId}?q=${encodeURIComponent(termine)}`,
      { headers: this.getAuthHeaders() }
    );
  }
}