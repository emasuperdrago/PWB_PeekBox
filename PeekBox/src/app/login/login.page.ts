import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonInputPasswordToggle, AlertController } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router'; // Aggiungi Router
import { DatabaseService } from '../services/database'; // Importa il service

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, IonButton, CommonModule, FormsModule, RouterModule, IonInputPasswordToggle]
})
export class LoginPage implements OnInit {

  email: string = '';
  password: string = '';

  constructor(
    private alertController: AlertController,
    private dbService: DatabaseService, // Iniettato
    private router: Router // Iniettato per navigare
  ) { }

  ngOnInit() { }

  // Funzione principale di Login
  async accedi() {
    this.dbService.loginUtente(this.email, this.password).subscribe({
      next: async (res: any) => {
        console.log('Login effettuato:', res);
        
        // 1. SALVIAMO I DATI NELLA MEMORIA DEL DISPOSITIVO
        // Salviamo il token restituito dal backend per l'autenticazione
        localStorage.setItem('token', res.token); 
        
        // Il nostro backend invia un oggetto 'user' con id, username ed email.
        // Convertiamo l'ID in stringa per evitare problemi di tipo nel localStorage
        localStorage.setItem('utente_id', String(res.user.id));
        localStorage.setItem('utente_nome', res.user.username);
        
        // 2. CI SPOSTIAMO SULLA HOME
        this.router.navigate(['/home']); 
      },
      error: async (err) => {
        console.error('Errore login:', err);
        const alert = await this.alertController.create({
          header: 'Accesso Negato',
          message: 'Email o password errati. Riprova.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  async recuperaPassword(event: Event) {
    event.preventDefault();
    const alert = await this.alertController.create({
      header: 'Recupero Password',
      message: 'Funzionalità non ancora disponibile sul database fisico.',
      buttons: ['OK']
    });
    await alert.present();
  }
}