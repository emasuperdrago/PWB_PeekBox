import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController, ToastController,
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonList, IonItem, IonLabel,
  IonBadge, IonModal, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonGrid, IonRow, IonCol, IonToggle
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { BackButtonComponent } from '../components/back-button/back-button.component';

import { addIcons } from 'ionicons';
import {
  add, camera, archiveOutline, addCircleOutline,
  trashOutline, imageOutline, cubeOutline, createOutline,
  qrCodeOutline, downloadOutline, locationOutline, navigateOutline,
  swapHorizontalOutline, documentTextOutline, cloudDownloadOutline,
  shareOutline, shieldCheckmarkOutline, alertCircleOutline, warningOutline,
  checkmarkCircleOutline, timeOutline
} from 'ionicons/icons';
import { PhotoService } from '../services/photo';
import { DatabaseService } from '../services/database';
import { ExportService } from '../services/export';
import { GpsService } from '../services/gps';

import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-dettaglio-box',
  templateUrl: './dettaglio-box.page.html',
  styleUrls: ['./dettaglio-box.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, QRCodeComponent, BackButtonComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonList, IonItem, IonLabel,
    IonBadge, IonModal, IonInput, IonTextarea, IonSelect,
    IonSelectOption, IonGrid, IonRow, IonCol, IonToggle
  ]
})
export class DettaglioBoxPage implements OnInit {

  boxId: string | null = null;
  utenteId: string | null = null;
  tipoProfilo: string = 'personal';

  boxCorrente: any = null;
  nomeArmadio: string = '';

  isModalOpen = false;
  isDettaglioOpen = false;
  oggettoSelezionato: any = null;
  editIndex: number | null = null;

  oggetti: any[] = [];
  tipiOggetto: any[] = [];

  qrCodeData: string = '';
  mostraQR: boolean = false;

  segnalazioni: any[] = [];
  segnalazioniNonLette: number = 0;
  mostraSegnalazioni: boolean = false;

  nuovoOggetto: any = {
    nome: '', descrizione: '', tipo: '', fragile: false, quantita: 1, foto: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    public photoService: PhotoService,
    private dbService: DatabaseService,
    private exportService: ExportService,
    private gpsService: GpsService
  ) {
    addIcons({
      add, camera, archiveOutline, addCircleOutline, trashOutline,
      imageOutline, cubeOutline, createOutline, qrCodeOutline,
      downloadOutline, locationOutline, navigateOutline,
      swapHorizontalOutline, documentTextOutline, cloudDownloadOutline,
      shareOutline, shieldCheckmarkOutline, alertCircleOutline, warningOutline,
      checkmarkCircleOutline, timeOutline
    });
  }

  ngOnInit() {
    this.boxId = this.route.snapshot.paramMap.get('id');
    this.utenteId = localStorage.getItem('utente_id');
    this.tipoProfilo = localStorage.getItem('tipo_profilo') || 'personal';

    if (this.boxId && this.utenteId) {
      this.caricaInfoBox();
      this.caricaOggettiDalServer();
      this.caricaTipologieDalServer();
      // Genera QR con URL pubblico Smart QR
      this.generaQrCodeUrl();
      this.registraCheckpointSeNecessario();
      this.caricaSegnalazioni();
    }
  }

  private async registraCheckpointSeNecessario() {
    this.dbService.getBoxSingola(Number(this.boxId)).subscribe({
      next: async (res: any) => {
        const box = res.box;
        const deveTracciare = box.moving_mode === 1 || this.tipoProfilo === 'business';

        if (deveTracciare) {
          try {
            const pos = await this.gpsService.getPosizione();
            this.dbService.salvaCheckpoint(
              Number(this.boxId), pos.latitudine, pos.longitudine, pos.accuratezza, 'Scansione QR'
            ).subscribe({
              next: async () => {
                const toast = await this.toastCtrl.create({
                  message: '📍 Posizione GPS registrata.',
                  duration: 2000,
                  color: 'success',
                  position: 'bottom'
                });
                await toast.present();
              },
              error: () => {}
            });
          } catch (err) {
            console.warn('GPS non disponibile al momento della scansione.');
          }
        }
      },
      error: () => {}
    });
  }

  // ─── CARICAMENTO DATI ──────────────────────────────────────

  caricaTipologieDalServer() {
    if (!this.utenteId) return;
    this.dbService.getTipologie(this.utenteId).subscribe({
      next: (res: any) => { this.tipiOggetto = res.tipologie || []; },
      error: (err: any) => console.error('Errore tipologie:', err)
    });
  }

  caricaInfoBox() {
    if (!this.boxId) return;
    this.dbService.getBoxSingola(Number(this.boxId)).subscribe({
      next: (res: any) => {
        this.boxCorrente = res.box;
        this.nomeArmadio = res.box.nome_armadio || 'Armadio sconosciuto';
      },
      error: (err: any) => console.error('Errore box:', err)
    });
  }

  caricaOggettiDalServer() {
    if (!this.boxId) return;
    this.dbService.getOggettiPerBox(Number(this.boxId)).subscribe({
      next: (res: any) => { this.oggetti = res.oggetti || []; },
      error: (err: any) => console.error('Errore oggetti:', err)
    });
  }

  // ─── SEGNALAZIONI ──────────────────────────────────────────

  caricaSegnalazioni() {
    if (!this.boxId) return;
    this.dbService.getSegnalazioni(Number(this.boxId)).subscribe({
      next: (res: any) => {
        this.segnalazioni = res.segnalazioni || [];
        const ultimaLettura = localStorage.getItem(`segnalazioni_lette_${this.boxId}`);
        if (ultimaLettura) {
          this.segnalazioniNonLette = this.segnalazioni.filter(
            s => new Date(s.timestamp) > new Date(ultimaLettura)
          ).length;
        } else {
          this.segnalazioniNonLette = this.segnalazioni.length;
        }
      },
      error: () => {}
    });
  }

  apriSegnalazioni() {
    this.mostraSegnalazioni = true;
    localStorage.setItem(`segnalazioni_lette_${this.boxId}`, new Date().toISOString());
    this.segnalazioniNonLette = 0;
  }

  formatData(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  apriPosizioneInMappa(lat: number, lng: number) {
    const url = this.gpsService.buildGoogleMapsUrl(lat, lng);
    window.open(url, '_blank');
  }

  // ─── TRACKING ──────────────────────────────────────────────

  apriTracking() {
    this.router.navigate(['/tracking-box', this.boxId]);
  }

  // ─── TRANSIT ZONE ──────────────────────────────────────────

  apriTransitZone() {
    this.router.navigate(['/transit-zone']);
  }

  // ─── CONDIVISIONE ARCHIVIO ─────────────────────────────────

  apriCondivisione() {
    const armadioId = this.boxCorrente?.rif_armadio;
    if (!armadioId) return;
    this.mostraQR = false;
    this.router.navigate(['/condivisione-archivio', armadioId], {
      queryParams: { nome: this.nomeArmadio }
    });
  }

  // ─── GEOFENCE ──────────────────────────────────────────────

  apriGeofence() {
    const armadioId = this.boxCorrente?.rif_armadio;
    if (!armadioId) return;
    this.mostraQR = false;
    this.router.navigate(['/geofence-armadio', armadioId], {
      queryParams: { nome: this.nomeArmadio }
    });
  }

  // ─── EXPORT / STAMPA ───────────────────────────────────────

  async stampaEtichettePDF() {
    if (!this.boxId) return;
    try {
      await this.exportService.stampaEtichetteBox(Number(this.boxId));
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Errore generazione etichette PDF.',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }

  downloadInventarioCsv() {
    if (!this.utenteId) return;
    this.exportService.downloadCsv(this.utenteId);
  }

  downloadInventarioJson() {
    if (!this.utenteId) return;
    this.exportService.downloadJson(this.utenteId);
  }

  // ─── GESTIONE OGGETTI ──────────────────────────────────────

  salvaOggetto() {
    if (!this.nuovoOggetto.nome || !this.nuovoOggetto.tipo || !this.nuovoOggetto.quantita) {
      this.mostraAlertCampi(); return;
    }

    if (this.editIndex !== null) {
      const oggettoId = this.oggetti[this.editIndex].id;
      this.dbService.aggiornaOggetto(oggettoId, this.nuovoOggetto).subscribe({
        next: () => { this.caricaOggettiDalServer(); this.setOpen(false); },
        error: (err: any) => console.error('Errore aggiornamento:', err)
      });
    } else {
      const datiOggetto = { ...this.nuovoOggetto, rif_box: Number(this.boxId) };
      this.dbService.creaOggetto(datiOggetto).subscribe({
        next: () => { this.caricaOggettiDalServer(); this.setOpen(false); },
        error: (err: any) => console.error('Errore salvataggio:', err)
      });
    }
  }

  apriModifica(index: number, event: Event) {
    event.stopPropagation();
    this.editIndex = index;
    this.nuovoOggetto = { ...this.oggetti[index] };
    this.isModalOpen = true;
  }

  async confermaEliminaOggetto(index: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Elimina',
      message: 'Vuoi rimuovere questo elemento dalla box?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina', role: 'destructive',
          handler: () => {
            this.dbService.eliminaOggetto(this.oggetti[index].id).subscribe({
              next: () => this.caricaOggettiDalServer(),
              error: (err: any) => console.error('Errore eliminazione:', err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async aggiungiNuovoTipo() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Nuova Categoria',
      inputs: [{ name: 'nuovoTipo', type: 'text', placeholder: 'Es. Utensili' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Aggiungi',
          handler: (data) => {
            if (data.nuovoTipo && this.utenteId) {
              this.dbService.creaTipologia(data.nuovoTipo, this.utenteId).subscribe({
                next: () => { this.caricaTipologieDalServer(); this.nuovoOggetto.tipo = data.nuovoTipo; },
                error: (err: any) => console.error('Errore tipologia:', err)
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ─── NAVIGAZIONE ───────────────────────────────────────────

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/home');
    }
  }

  // ─── UI UTILITY ────────────────────────────────────────────

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen) this.resetForm();
  }

  resetForm() {
    this.nuovoOggetto = { nome: '', descrizione: '', tipo: '', fragile: false, quantita: 1, foto: null };
    this.editIndex = null;
  }

  async scattaFoto() {
    try {
      const photo = await this.photoService.addNewToGallery();
      this.nuovoOggetto.foto = photo.webviewPath;
    } catch (error) { console.error(error); }
  }

  apriDettaglio(oggetto: any) {
    this.oggettoSelezionato = oggetto;
    this.isDettaglioOpen = true;
  }

  chiudiDettaglio() {
    this.isDettaglioOpen = false;
    setTimeout(() => { this.oggettoSelezionato = null; }, 300);
  }

  async mostraAlertCampi() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Attenzione',
      message: 'Compila tutti i campi obbligatori.',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await alert.present();
  }

  generaQrCodeUrl() {
    if (!this.boxId) return;
    this.dbService.getQrToken(Number(this.boxId)).subscribe({
      next: (res: any) => {
        // Costruisce l'URL lato client usando l'IP con cui il browser ha raggiunto l'app
        // In questo modo funziona sia su localhost che da telefono sulla stessa rete
        const token = res.token;
        this.qrCodeData = this.dbService.buildQrUrl(Number(this.boxId), token);
      },
      error: () => {
        this.qrCodeData = `peekbox-box-${this.boxId}`;
      }
    });
  }

  toggleQR() { this.mostraQR = !this.mostraQR; }

  scaricaQRCode() {
    const canvas = document.querySelector('qrcode canvas') as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `QR_Box_${this.boxCorrente?.nome || 'Sconosciuta'}.png`;
      link.click();
    }
  }
}
