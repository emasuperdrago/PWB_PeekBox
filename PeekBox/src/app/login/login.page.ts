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
        // In futuro qui potresti salvare l'ID utente in un segnale o storage
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