// ============================================================
// FILE: PeekBox/src/app/login/login.page.ts  — SOSTITUZIONE COMPLETA
// Aggiunge: pop-up notifica "Box in attesa" dopo login riuscito
// ============================================================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonInput, IonButton, IonInputPasswordToggle,
  AlertController, ModalController
} from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonInput, IonButton, CommonModule, FormsModule,
    RouterModule, IonInputPasswordToggle
  ]
})
export class LoginPage implements OnInit {

  email: string = '';
  password: string = '';

  bgImage: string = 'https://plus.unsplash.com/premium_photo-1661913412680-c274b6fea096?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  constructor(
    private alertController: AlertController,
    private dbService: DatabaseService,
    private router: Router
  ) { }

  ngOnInit() { }

  async accedi() {
    this.dbService.loginUtente(this.email, this.password).subscribe({
      next: async (res: any) => {
        console.log('Login effettuato:', res);

        // Salva dati utente in localStorage
        localStorage.setItem('token', res.token);
        localStorage.setItem('utente_id', String(res.user.id));
        localStorage.setItem('utente_nome', res.user.username);
        localStorage.setItem('utente_email', res.user.email || '');
        localStorage.setItem('tipo_profilo', res.user.tipo_profilo || 'personal');
        localStorage.setItem('is_admin', res.user.is_admin ? '1' : '0');

        // ★ NUOVO: controlla condivisioni in_attesa e mostra pop-up se necessario
        await this.controllaPendingENaviga(String(res.user.id));
      },
      error: async (err) => {
        console.error('Errore login:', err);
        const alert = await this.alertController.create({
          cssClass: 'peekbox-alert',
          header: 'Accesso Negato',
          message: 'Email o password errati. Riprova.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  /**
   * ★ NUOVO: Controlla se ci sono condivisioni in sospeso.
   * Se sì, mostra un modale di notifica prima di andare alla home.
   */
  private async controllaPendingENaviga(utenteId: string) {
    try {
      this.dbService.getCondivisioniPending(utenteId).subscribe({
        next: async (res) => {
          if (res.pending > 0) {
            await this.mostraPopupBoxRicevute(res.pending);
          } else {
            this.router.navigate(['/home']);
          }
        },
        error: () => {
          // In caso di errore sulla chiamata pending, vai comunque alla home
          this.router.navigate(['/home']);
        }
      });
    } catch {
      this.router.navigate(['/home']);
    }
  }

  /**
   * ★ NUOVO: Mostra il pop-up "Hai ricevuto box condivise".
   * L'utente può andare subito alla schermata "Box Ricevute" oppure alla home.
   */
  private async mostraPopupBoxRicevute(quantita: number) {
    const testoSingolare = quantita === 1
      ? 'Hai ricevuto <strong>1 nuova box condivisa</strong> in attesa di approvazione!'
      : `Hai ricevuto <strong>${quantita} nuove box condivise</strong> in attesa di approvazione!`;

    const alert = await this.alertController.create({
      cssClass: 'peekbox-alert peekbox-alert--notify',
      header: '📦 Box Ricevute',
      message: testoSingolare,
      buttons: [
        {
          text: 'Vai alla Home',
          role: 'cancel',
          handler: () => {
            this.router.navigate(['/home']);
          }
        },
        {
          text: 'Visualizza Box',
          cssClass: 'alert-btn-primary',
          handler: () => {
            // Naviga direttamente alla schermata "Box Ricevute"
            this.router.navigate(['/box-ricevute']);
          }
        }
      ]
    });
    await alert.present();
  }

  async recuperaPassword(event: Event) {
    event.preventDefault();
    const alert = await this.alertController.create({
      cssClass: 'peekbox-alert',
      header: 'Recupero Password',
      message: 'Funzionalità non ancora disponibile sul database fisico.',
      buttons: ['OK']
    });
    await alert.present();
  }
}
