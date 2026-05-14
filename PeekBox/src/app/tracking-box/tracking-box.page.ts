import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonList, IonItem, IonLabel,
  IonBadge, IonToggle, AlertController, ToastController
} from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../components/back-button/back-button.component';
import { addIcons } from 'ionicons';
import { locationOutline, mapOutline, trashOutline, refreshOutline, navigateOutline } from 'ionicons/icons';
import { DatabaseService } from '../services/database';
import { GpsService } from '../services/gps';

@Component({
  selector: 'app-tracking-box',
  templateUrl: './tracking-box.page.html',
  styleUrls: ['./tracking-box.page.scss'],
  standalone: true,
  imports: [
BackButtonComponent,     CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonList, IonItem, IonLabel,
    IonBadge, IonToggle
  ]
})
export class TrackingBoxPage implements OnInit {

  boxId: string | null = null;
  utenteId: string | null = null;
  tipoProfilo: string = 'personal';

  boxInfo: any = null;
  checkpoints: any[] = [];
  isLoading = false;
  movingModeAttivo = false;

  constructor(
    private route: ActivatedRoute,
    private dbService: DatabaseService,
    private gpsService: GpsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ locationOutline, mapOutline, trashOutline, refreshOutline, navigateOutline });
  }

  ngOnInit() {
    this.boxId = this.route.snapshot.paramMap.get('id');
    this.utenteId = localStorage.getItem('utente_id');
    this.tipoProfilo = localStorage.getItem('tipo_profilo') || 'personal';

    if (this.boxId) {
      this.caricaBoxInfo();
      this.caricaCheckpoints();
    }
  }

  caricaBoxInfo() {
    if (!this.boxId) return;
    this.dbService.getBoxSingola(Number(this.boxId)).subscribe({
      next: (res: any) => {
        this.boxInfo = res.box;
        this.movingModeAttivo = res.box.moving_mode === 1;
      },
      error: (err: any) => console.error('Errore caricamento box:', err)
    });
  }

  caricaCheckpoints() {
    if (!this.boxId) return;
    this.isLoading = true;
    this.dbService.getCheckpoints(Number(this.boxId)).subscribe({
      next: (res: any) => {
        this.checkpoints = res.checkpoints || [];
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Errore checkpoints:', err);
        this.isLoading = false;
      }
    });
  }

  async toggleMovingMode(event: any) {
    const nuovoStato = event.detail.checked;
    this.dbService.updateMovingMode(Number(this.boxId), nuovoStato).subscribe({
      next: async () => {
        this.movingModeAttivo = nuovoStato;
        const toast = await this.toastCtrl.create({
          message: nuovoStato ? '🚚 Moving Mode attivato! Il GPS verrà registrato ad ogni scansione.' : 'Moving Mode disattivato.',
          duration: 2500,
          color: nuovoStato ? 'success' : 'medium',
          position: 'bottom'
        });
        await toast.present();
      },
      error: (err: any) => console.error('Errore toggle moving mode:', err)
    });
  }

  /** Aggiunge manualmente un checkpoint con la posizione attuale e verifica geofence */
  async aggiungiCheckpointManuale() {
    try {
      const pos = await this.gpsService.getPosizione();
      const alert = await this.alertCtrl.create({
        cssClass: 'peekbox-alert',
        header: 'Etichetta Posizione',
        message: 'Aggiungi una descrizione opzionale per questo punto.',
        inputs: [{ name: 'label', type: 'text', placeholder: 'Es. Magazzino Milano' }],
        buttons: [
          { text: 'Annulla', role: 'cancel' },
          {
            text: 'Salva',
            handler: (data) => {
              // Usa checkpoint/sicuro per controllo geofence automatico
              this.dbService.salvaCheckpointSicuro(
                Number(this.boxId), pos.latitudine, pos.longitudine, pos.accuratezza, data.label || undefined
              ).subscribe({
                next: async (res: any) => {
                  this.caricaCheckpoints();
                  // Se c'è un'eccezione di sicurezza, mostra l'alert geofence
                  if (res.geofence_alert) {
                    const alertGeofence = await this.alertCtrl.create({
                      cssClass: 'peekbox-alert peekbox-alert--danger',
                      header: '⚠️ Eccezione di Sicurezza',
                      message: res.geofence_alert.messaggio,
                      buttons: ['OK']
                    });
                    await alertGeofence.present();
                  } else {
                    const toast = await this.toastCtrl.create({
                      message: '✅ Posizione registrata. Asset nel perimetro.',
                      duration: 2000,
                      color: 'success',
                      position: 'bottom'
                    });
                    await toast.present();
                  }
                },
                error: (err: any) => console.error('Errore salvataggio checkpoint:', err)
              });
            }
          }
        ]
      });
      await alert.present();
    } catch (err: any) {
      const alert = await this.alertCtrl.create({
        cssClass: 'peekbox-alert',
        header: 'GPS non disponibile',
        message: err.message,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  apriPosizioneInMappa(lat: number, lng: number) {
    const url = this.gpsService.buildGoogleMapsUrl(lat, lng);
    window.open(url, '_blank');
  }

  apriPercorsoCompleto() {
    if (this.checkpoints.length < 2) return;
    const url = this.gpsService.buildPercorsoUrl(this.checkpoints);
    window.open(url, '_blank');
  }

  async confermaResetTracking() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Reset Tracking',
      message: 'Eliminare tutti i checkpoint di questa box? L\'operazione è irreversibile.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina Storico',
          role: 'destructive',
          handler: () => {
            this.dbService.eliminaCheckpoints(Number(this.boxId)).subscribe({
              next: () => { this.checkpoints = []; },
              error: (err: any) => console.error('Errore reset:', err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  formatData(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
