import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../components/back-button/back-button.component';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonToggle,
  IonList, IonBadge, IonNote, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline, warningOutline, checkmarkCircleOutline,
  navigateOutline, refreshOutline, eyeOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-geofencing-armadio',
  templateUrl: './geofencing-armadio.page.html',
  styleUrls: ['./geofencing-armadio.page.scss'],
  standalone: true,
  imports: [
BackButtonComponent,     CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonItem, IonLabel, IonInput, IonButton, IonIcon, IonToggle,
    IonList, IonBadge, IonNote
  ]
})
export class GeofencingArmadioPage implements OnInit {

  armadioId!: number;
  alertGeofencing: any[] = [];

  // Configurazione perimetro
  geo_lat: number | null = null;
  geo_lng: number | null = null;
  geo_raggio_m: number = 50;
  nomeArmadio: string = '';

  // Simulazione scansione asset
  lat_asset: number | null = null;
  lng_asset: number | null = null;
  risultatoVerifica: any = null;
  verificaInCorso: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private dbService: DatabaseService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ locationOutline, warningOutline, checkmarkCircleOutline, navigateOutline, refreshOutline, eyeOutline });
  }

  ngOnInit() {
    this.armadioId = Number(this.route.snapshot.paramMap.get('id'));
    this.nomeArmadio = history.state?.nomeArmadio || `Armadio #${this.armadioId}`;
    this.geo_lat = history.state?.geo_lat ?? null;
    this.geo_lng = history.state?.geo_lng ?? null;
    this.geo_raggio_m = history.state?.geo_raggio_m ?? 50;
    this.caricaAlert();
  }

  caricaAlert() {
    this.dbService.getAlertGeofencing().subscribe({
      next: (res: any) => {
        this.alertGeofencing = (res.alert || []).filter((a: any) => a.rif_armadio === this.armadioId);
      },
      error: (err: any) => console.error(err)
    });
  }

  /** Acquisisce la posizione GPS del dispositivo e la imposta come centro del perimetro */
  usaPosizioneCorrente() {
    if (!navigator.geolocation) {
      this.mostraToast('Geolocalizzazione non supportata dal dispositivo.', 'warning');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.geo_lat = pos.coords.latitude;
        this.geo_lng = pos.coords.longitude;
        this.mostraToast(`Posizione acquisita: ${this.geo_lat?.toFixed(5)}, ${this.geo_lng?.toFixed(5)}`, 'success');
      },
      () => this.mostraToast('Impossibile ottenere la posizione.', 'danger')
    );
  }

  salvaGeofencing() {
    if (this.geo_lat == null || this.geo_lng == null) {
      this.mostraToast('Imposta prima le coordinate del perimetro.', 'warning');
      return;
    }
    this.dbService.aggiornaArmadio(this.armadioId, this.nomeArmadio, this.geo_lat, this.geo_lng, this.geo_raggio_m).subscribe({
      next: async () => this.mostraToast('Perimetro virtuale salvato!', 'success'),
      error: async (err: any) => this.mostraToast(err.error?.error || 'Errore salvataggio.', 'danger')
    });
  }

  disabilitaGeofencing() {
    this.dbService.aggiornaArmadio(this.armadioId, this.nomeArmadio, undefined, undefined, 50).subscribe({
      next: () => {
        this.geo_lat = null;
        this.geo_lng = null;
        this.mostraToast('Geofencing disabilitato.', 'medium');
      }
    });
  }

  /** Simula la scansione di un asset: invia le coordinate e riceve il risultato */
  verificaPosizoneAsset() {
    if (this.lat_asset == null || this.lng_asset == null) {
      this.mostraToast('Inserisci le coordinate dell\'asset da verificare.', 'warning');
      return;
    }
    this.verificaInCorso = true;
    this.risultatoVerifica = null;
    this.dbService.verificaGeofencing(this.armadioId, this.lat_asset, this.lng_asset).subscribe({
      next: (res: any) => {
        this.risultatoVerifica = res;
        this.verificaInCorso = false;
        if (!res.dentro_perimetro) {
          this.caricaAlert(); // aggiorna lista alert
          this.mostraToast(`⚠️ ANOMALIA: asset a ${res.distanza_m} m dal perimetro!`, 'danger');
        } else {
          this.mostraToast('✅ Asset all\'interno del perimetro.', 'success');
        }
      },
      error: (err: any) => {
        this.verificaInCorso = false;
        this.mostraToast(err.error?.error || 'Errore verifica.', 'danger');
      }
    });
  }

  usaPosizoneAssetCorrente() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        this.lat_asset = pos.coords.latitude;
        this.lng_asset = pos.coords.longitude;
        this.mostraToast('Coordinate asset acquisite dal dispositivo.', 'success');
      },
      () => this.mostraToast('Impossibile ottenere la posizione.', 'danger')
    );
  }

  segnaLetto(alert: any) {
    this.dbService.segnaAlertLetto(alert.id).subscribe({
      next: () => {
        alert.letto = 1;
        this.alertGeofencing = this.alertGeofencing.filter(a => a.id !== alert.id);
      }
    });
  }

  private async mostraToast(messaggio: string, color: string) {
    const toast = await this.toastCtrl.create({ message: messaggio, duration: 3000, color });
    toast.present();
  }
}
