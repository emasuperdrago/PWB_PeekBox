import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  async initPlugin() {
    console.log('✅ Service pronto a comunicare con il Backend');
  }

  // --- AUTENTICAZIONE ---

  registraUtente(username: string, email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/registrazione`, {
      username: username,
      email: email,
      password: pass
    });
  }

  loginUtente(email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/login`, {
      email: email,
      password: pass
    });
  }

  // --- FUNZIONI PER ARMADI ---

  getArmadi(utenteId: string) {
    return this.http.get(`${this.apiUrl}/armadi/${utenteId}`);
  }

  creaArmadio(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/armadi`, {
      nome: nome,
      rif_utente: utenteId
    });
  }

  eliminaArmadio(id: number) {
    return this.http.delete(`${this.apiUrl}/armadi/${id}`);
  }

  // --- FUNZIONI PER LE BOX ---

  getBox(utenteId: string) {
    return this.http.get(`${this.apiUrl}/box/${utenteId}`);
  }

  creaBox(nome: string, rif_armadio: string, is_preferito: boolean) {
    return this.http.post(`${this.apiUrl}/box`, {
      nome: nome,
      rif_armadio: rif_armadio,
      is_preferito: is_preferito
    });
  }

  // Aggiunto per gestire i "Mi Piace" e permettere il filtraggio corretto
  updatePreferito(id: number, is_preferito: boolean) {
    return this.http.put(`${this.apiUrl}/box/preferito/${id}`, {
      is_preferito: is_preferito
    });
  }

  eliminaBox(id: number) {
    return this.http.delete(`${this.apiUrl}/box/${id}`);
  }

  // --- FUNZIONI PER GLI OGGETTI ---

  getOggettiPerBox(boxId: number) {
    return this.http.get(`${this.apiUrl}/oggetti/${boxId}`);
  }

  creaOggetto(dati: any) {
    return this.http.post(`${this.apiUrl}/oggetti`, dati);
  }

  // --- FUNZIONI PER LE TIPOLOGIE ---

  getTipologie(utenteId: string) {
    return this.http.get(`${this.apiUrl}/tipologie/${utenteId}`);
  }

  creaTipologia(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/tipologie`, {
      nome: nome,
      rif_utente: utenteId
    });
  }

  eliminaTipologia(id: number) {
    return this.http.delete(`${this.apiUrl}/tipologie/${id}`);
  }
}