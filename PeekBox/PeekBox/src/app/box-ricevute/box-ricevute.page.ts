// ============================================================
// FILE: PeekBox/src/app/box-ricevute/box-ricevute.page.ts
// NUOVA PAGINA — Schermata "Box Ricevute" con Accetta/Rifiuta
// ============================================================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  AlertController, ToastController,
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonBadge, IonSpinner, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline, closeCircleOutline, archiveOutline,
  timeOutline, personOutline, homeOutline, arrowBackOutline,
  refreshOutline, mailOpenOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-box-ricevute',
  templateUrl: './box-ricevute.page.html',
  styleUrls: ['./box-ricevute.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonBadge, IonSpinner, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonFooter
  ]
})
export class BoxRicevutePage implements OnInit {

  richiestePending: any[] = [];
  archiviAccettati: any[] = [];
  isLoading = true;
  utenteId: string | null = null;

  constructor(
    private dbService: DatabaseService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      checkmarkCircleOutline, closeCircleOutline, archiveOutline,
      timeOutline, personOutline, homeOutline, arrowBackOutline,
      refreshOutline, mailOpenOutline
    });
  }

  ngOnInit() {
    this.utenteId = localStorage.getItem('utente_id');
    this.caricaTutto();
  }

  ionViewWillEnter() {
    this.caricaTutto();
  }

  caricaTutto() {
    if (!this.utenteId) return;
    this.isLoading = true;

    // Carica le richieste IN ATTESA
    this.dbService.getCondivisioniInAttesa(this.utenteId).subscribe({
      next: (res) => {
        this.richiestePending = res.richieste || [];
      },
      error: (err) => console.error('Errore richieste pending:', err)
    });

    // Carica TUTTE le condivisioni per mostrare gli archivi già accettati
    this.dbService.getArchividCondivisiConMe(this.utenteId).subscribe({
      next: (res) => {
        this.archiviAccettati = (res.archivi_condivisi || [])
          .filter((c: any) => c.stato === 'accettata');
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Errore archivi condivisi:', err);
        this.isLoading = false;
      }
    });
  }

  // ─── ACCETTA ─────────────────────────────────────────────────────────────

  async accetta(condivisione: any) {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Accetta Condivisione',
      message: `Vuoi accettare l'accesso all'archivio <strong>"${condivisione.armadio_nome}"</strong> condiviso da <strong>${condivisione.proprietario_username}</strong>?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Accetta',
          cssClass: 'alert-btn-primary',
          handler: () => this.eseguiAccetta(condivisione)
        }
      ]
    });
    await alert.present();
  }

  private eseguiAccetta(condivisione: any) {
    this.dbService.accettaCondivisione(condivisione.condivisione_id).subscribe({
      next: async () => {
        this.richiestePending = this.richiestePending
          .filter(r => r.condivisione_id !== condivisione.condivisione_id);
        this.archiviAccettati.push({ ...condivisione, stato: 'accettata' });

        const toast = await this.toastCtrl.create({
          message: `✅ Archivio "${condivisione.armadio_nome}" aggiunto alle tue condivisioni!`,
          duration: 3000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({
          message: `❌ Errore: ${err?.error?.error || 'impossibile accettare.'}`,
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  // ─── RIFIUTA ─────────────────────────────────────────────────────────────

  async rifiuta(condivisione: any) {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Rifiuta Condivisione',
      message: `Sei sicuro di voler rifiutare l'accesso all'archivio <strong>"${condivisione.armadio_nome}"</strong>? L'invito verrà eliminato.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Rifiuta',
          role: 'destructive',
          handler: () => this.eseguiRifiuta(condivisione)
        }
      ]
    });
    await alert.present();
  }

  private eseguiRifiuta(condivisione: any) {
    this.dbService.rifiutaCondivisione(condivisione.condivisione_id).subscribe({
      next: async () => {
        this.richiestePending = this.richiestePending
          .filter(r => r.condivisione_id !== condivisione.condivisione_id);

        const toast = await this.toastCtrl.create({
          message: `🗑️ Invito rifiutato ed eliminato.`,
          duration: 2500,
          color: 'medium',
          position: 'bottom'
        });
        await toast.present();
      },
      error: async (err) => {
        const toast = await this.toastCtrl.create({
          message: `❌ Errore: ${err?.error?.error || 'impossibile rifiutare.'}`,
          duration: 3000,
          color: 'danger',
          position: 'bottom'
        });
        await toast.present();
      }
    });
  }

  // ─── FIX: APRI BOX CONDIVISA ─────────────────────────────────────────────
  //
  // Il bug originale era che le box condivise usavano [routerLink] con box.id
  // ma il dettaglio-box chiamava getBoxSingola() che verifica la proprietà.
  // La soluzione è navigare con un queryParam "condivisa=true" così
  // dettaglio-box può usare getOggettiBoxCondivisa() invece di getOggettiPerBox().

  apriArchivioCondiviso(archivio: any) {
    // Naviga alla lista box dell'archivio condiviso
    this.router.navigate(['/dettaglio-archivio-condiviso', archivio.armadio_id], {
      queryParams: {
        nome: archivio.armadio_nome,
        ruolo: archivio.ruolo,
        condivisa: 'true'
      }
    });
  }

  tornaHome() {
    this.router.navigateByUrl('/home');
  }

  formattaData(data: string): string {
    if (!data) return '';
    return new Date(data).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
}
