import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  // L'URL del tuo server Node.js
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  async initPlugin() {
    console.log('✅ Service pronto a comunicare con il Backend');
  }

  // Funzione per registrare un utente sul server
  registraUtente(username: string, email: string, pass: string) {
    return this.http.post(`${this.apiUrl}/registrazione`, {
      username: username,
      email: email,
      password: pass
    });
  }

  // Aggiungi questo metodo dentro la classe DatabaseService
loginUtente(email: string, pass: string) {
  return this.http.post(`${this.apiUrl}/login`, {
    email: email,
    password: pass
  });
}

}