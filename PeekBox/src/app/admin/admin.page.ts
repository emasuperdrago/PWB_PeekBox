import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonFooter,
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline, trashOutline, archiveOutline, cubeOutline,
  shieldCheckmarkOutline, arrowBackOutline, home, search,
  personCircleOutline, alertCircleOutline, checkmarkCircleOutline,
} from 'ionicons/icons';

import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonFooter,
  ],
})
export class AdminPage implements OnInit {

  utenti: any[] = [];
  isLoading = true;
  errore: string = '';

  nomeAdmin: string = '';
  utenteIdCorrente: string | null = null;

  constructor(
    private alertCtrl: AlertController,
    private dbService: DatabaseService,
    private router: Router,
  ) {
    addIcons({
      peopleOutline, trashOutline, archiveOutline, cubeOutline,
      shieldCheckmarkOutline, arrowBackOutline, home, search,
      personCircleOutline, alertCircleOutline, checkmarkCircleOutline,
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.utenteIdCorrente = localStorage.getItem('utente_id');
    this.nomeAdmin = (localStorage.getItem('utente_nome') || '').toUpperCase();

    // Controllo client-side (la protezione vera è server-side)
    const isAdmin = localStorage.getItem('is_admin');
    if (isAdmin !== '1') {
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    this.caricaUtenti();
  }

  caricaUtenti() {
    this.isLoading = true;
    this.errore = '';

    this.dbService.adminGetUtenti().subscribe({
      next: (res: any) => {
        this.utenti = res.utenti || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errore = 'Impossibile caricare gli utenti. Verifica di avere i permessi admin.';
        this.isLoading = false;
      }
    });
  }

  iniziale(nome: string): string {
    return (nome || '?').charAt(0).toUpperCase();
  }

  async confermaEliminazione(utente: any) {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Elimina Account',
      message: `Sei sicuro di voler eliminare l'account di <strong>${utente.username}</strong> (${utente.email})?<br><br>Questa azione è <strong>irreversibile</strong> e rimuoverà tutti i dati associati.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => this.eliminaUtente(utente)
        }
      ]
    });
    await alert.present();
  }

  eliminaUtente(utente: any) {
    this.dbService.adminEliminaUtente(utente.id).subscribe({
      next: async () => {
        this.utenti = this.utenti.filter(u => u.id !== utente.id);
        const toast = await this.alertCtrl.create({
          cssClass: 'peekbox-alert',
          header: 'Account eliminato',
          message: `L'account di ${utente.username} è stato rimosso.`,
          buttons: ['OK']
        });
        await toast.present();
      },
      error: async (err) => {
        const msg = err?.error?.error || 'Errore durante l\'eliminazione.';
        const alert = await this.alertCtrl.create({
          cssClass: 'peekbox-alert',
          header: 'Errore',
          message: msg,
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  // ── NAVBAR ──────────────────────────────────────────────────

  vaiHome() { this.router.navigateByUrl('/home'); }
  vaiSearch() { this.router.navigateByUrl('/search'); }
  vaiProfilo() { this.router.navigateByUrl('/area-personale'); }

  inizialeAdmin(): string {
    return this.nomeAdmin.charAt(0) || 'A';
  }
}
