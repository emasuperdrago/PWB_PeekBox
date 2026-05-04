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

  // --- NUOVE FUNZIONI FULL-STACK PER I DATI ---

  // 1. Chiede al server tutti gli armadi di un utente specifico
  getArmadi(utenteId: string) {
    return this.http.get(`${this.apiUrl}/armadi/${utenteId}`);
  }

  // 2. Chiede al server tutte le box (di tutti gli armadi) di un utente specifico
  getBox(utenteId: string) {
    return this.http.get(`${this.apiUrl}/box/${utenteId}`);
  }

  // Salva un nuovo armadio
  creaArmadio(nome: string, utenteId: string) {
    return this.http.post(`${this.apiUrl}/armadi`, {
      nome: nome,
      rif_utente: utenteId
    });
  }

  // Salva una nuova box
  creaBox(nome: string, rif_armadio: string, is_preferito: boolean) {
    return this.http.post(`${this.apiUrl}/box`, {
      nome: nome,
      rif_armadio: rif_armadio,
      is_preferito: is_preferito
    });
  }

  // --- FUNZIONI PER GLI OGGETTI ---

  getOggettiPerBox(boxId: number) {
    return this.http.get(`${this.apiUrl}/oggetti/${boxId}`);
  }

  creaOggetto(dati: any) {
    return this.http.post(`${this.apiUrl}/oggetti`, dati);
  }
}
