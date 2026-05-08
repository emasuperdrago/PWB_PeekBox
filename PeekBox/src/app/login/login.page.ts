import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonInputPasswordToggle, AlertController } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { DatabaseService } from '../services/database';

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

  // Immagine di sfondo aggiornata
  bgImage: string = 'https://plus.unsplash.com/premium_photo-1661913412680-c274b6fea096?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  constructor(
    private alertController: AlertController,
    private dbService: DatabaseService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  async accedi() {
    this.dbService.loginUtente(this.email, this.password).subscribe({
      next: async (res: any) => {
        console.log('Login effettuato:', res);
        localStorage.setItem('token', res.token);
        localStorage.setItem('utente_id', String(res.user.id));
        localStorage.setItem('utente_nome', res.user.username);
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