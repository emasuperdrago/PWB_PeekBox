import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonFooter,
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  archiveOutline, cubeOutline, timeOutline, logOutOutline,
  chevronForwardOutline, arrowBackOutline, trashOutline,
  informationCircleOutline, personCircleOutline, home, search,
  closeOutline, checkmarkCircleOutline, shieldCheckmarkOutline,
} from 'ionicons/icons';

import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-area-personale',
  templateUrl: 'area-personale.page.html',
  styleUrls: ['area-personale.page.scss'],
  standalone: true,
  providers: [DatePipe],
  imports: [
    CommonModule, RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonFooter,
  ],
})
export class AreaPersonalePage implements OnInit {

  // Dati utente
  utenteId: string | null = null;
  nomeUtente: string = '';
  emailUtente: string = '';
  isAdmin: boolean = false;

  // Statistiche
  totaleBox: number = 0;
  totaleArticoli: number = 0;

  // Stato sezione
  vistaCorrente: 'profilo' | 'box-eliminate' = 'profilo';

  // Box eliminate
  boxEliminate: any[] = [];
  isLoadingEliminate = false;

  constructor(
    private alertCtrl: AlertController,
    private dbService: DatabaseService,
    private router: Router,
    private datePipe: DatePipe
  ) {
    addIcons({
      archiveOutline, cubeOutline, timeOutline, logOutOutline,
      chevronForwardOutline, arrowBackOutline, trashOutline,
      informationCircleOutline, personCircleOutline, home, search,
      closeOutline, checkmarkCircleOutline, shieldCheckmarkOutline,
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.utenteId = localStorage.getItem('utente_id');
    this.nomeUtente = (localStorage.getItem('utente_nome') || '').toUpperCase();
    this.emailUtente = localStorage.getItem('utente_email') || '';
    this.isAdmin = localStorage.getItem('is_admin') === '1';

    if (this.utenteId) {
      this.caricaStatistiche(this.utenteId);
    }

    this.vistaCorrente = 'profilo';
  }

  // =====================================================
  // CARICAMENTO DATI
  // =====================================================

  caricaStatistiche(idUtente: string) {
    this.dbService.getBox(idUtente).subscribe({
      next: (res: any) => {
        const box: any[] = res.box || [];
        this.totaleBox = box.length;
        this.totaleArticoli = box.reduce(
          (acc: number, b: any) => acc + (b.num_oggetti || 0), 0
        );
      },
      error: () => {}
    });
  }

  apriBoxEliminate() {
    this.vistaCorrente = 'box-eliminate';
    this.isLoadingEliminate = true;
    this.boxEliminate = [];

    if (this.utenteId) {
      this.dbService.getBoxEliminate(this.utenteId).subscribe({
        next: (res: any) => {
          const trentaMs = 30 * 24 * 60 * 60 * 1000;
          const ora = Date.now();
          this.boxEliminate = (res.box_eliminate || []).filter((b: any) => {
            const diff = ora - new Date(b.data_eliminazione).getTime();
            return diff <= trentaMs;
          });
          this.isLoadingEliminate = false;
        },
        error: () => { this.isLoadingEliminate = false; }
      });
    }
  }

  tornaAlProfilo() {
    this.vistaCorrente = 'profilo';
  }

  // =====================================================
  // UTILITY
  // =====================================================

  /** Giorni rimasti prima della rimozione definitiva */
  giorniRimasti(dataEliminazione: string): number {
    const diff = Date.now() - new Date(dataEliminazione).getTime();
    const giorniPassati = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - giorniPassati);
  }

  /** Percentuale del tempo trascorso (per la barra progresso) */
  percentualeScadenza(dataEliminazione: string): number {
    const diff = Date.now() - new Date(dataEliminazione).getTime();
    const giorniPassati = diff / (1000 * 60 * 60 * 24);
    return Math.min(100, Math.round((giorniPassati / 30) * 100));
  }

  /** Classe colore badge in base ai giorni rimasti */
  badgeClass(dataEliminazione: string): string {
    const gg = this.giorniRimasti(dataEliminazione);
    if (gg <= 5) return 'badge--red';
    if (gg <= 10) return 'badge--amber';
    return 'badge--blue';
  }

  iniziale(): string {
    return this.nomeUtente.charAt(0) || '?';
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async confermaLogout() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Logout',
      message: 'Sei sicuro di voler uscire dal tuo account?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Esci', role: 'destructive', handler: () => this.eseguiLogout() }
      ]
    });
    await alert.present();
  }

  eseguiLogout() {
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // =====================================================
  // NAVIGAZIONE NAVBAR
  // =====================================================

  vaiHome() {
    this.router.navigateByUrl('/home');
  }

  vaiSearch() {
    this.router.navigateByUrl('/search');
  }

  vaiAdmin() {
    this.router.navigateByUrl('/admin');
  }
}
