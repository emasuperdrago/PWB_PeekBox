import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  AlertController,
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonButton, IonIcon, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, 
  IonBadge, IonModal, IonInput, IonTextarea, IonSelect, 
  IonSelectOption, IonGrid, IonRow, IonCol, IonToggle 
} from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';

import { addIcons } from 'ionicons';
import { 
  add, camera, archiveOutline, addCircleOutline, 
  trashOutline, imageOutline, cubeOutline, createOutline,
  qrCodeOutline, downloadOutline
} from 'ionicons/icons';
import { PhotoService } from '../services/photo'; 
import { DatabaseService } from '../services/database';

import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-dettaglio-box',
  templateUrl: './dettaglio-box.page.html',
  styleUrls: ['./dettaglio-box.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, QRCodeComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonButton, IonIcon, IonCard, IonCardHeader, 
    IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, 
    IonBadge, IonModal, IonInput, IonTextarea, IonSelect, 
    IonSelectOption, IonGrid, IonRow, IonCol, IonToggle
  ]
})
export class DettaglioBoxPage implements OnInit {
  
  boxId: string | null = null;
  utenteId: string | null = null;
  
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

  nuovoOggetto: any = {
    nome: '',
    descrizione: '',
    tipo: '',
    fragile: false,
    quantita: 1,
    foto: null
  };

  constructor(
    private route: ActivatedRoute, 
    private alertCtrl: AlertController,
    public photoService: PhotoService,
    private dbService: DatabaseService
  ) {
    addIcons({ add, camera, archiveOutline, addCircleOutline, trashOutline, imageOutline, cubeOutline, createOutline, qrCodeOutline, downloadOutline });
  }

  ngOnInit() {
    this.boxId = this.route.snapshot.paramMap.get('id');
    this.utenteId = localStorage.getItem('utente_id');
    
    if (this.boxId && this.utenteId) {
      this.caricaInfoBox(); 
      this.caricaOggettiDalServer();
      this.caricaTipologieDalServer();
      this.qrCodeData = `peekbox-box-${this.boxId}`;
    }
  }

  // --- CARICAMENTO DATI ---

  caricaTipologieDalServer() {
    if (!this.utenteId) return;
    this.dbService.getTipologie(this.utenteId).subscribe({
      next: (res: any) => {
        this.tipiOggetto = res.tipologie || [];
      },
      error: (err: any) => console.error("Errore caricamento tipologie:", err)
    });
  }

  // FIX BUG 7: Caricamento ottimizzato della singola box
  caricaInfoBox() {
    if (!this.boxId) return;
    this.dbService.getBoxSingola(Number(this.boxId)).subscribe({
      next: (res: any) => {
        this.boxCorrente = res.box;
        // Il backend ora restituisce direttamente il nome dell'armadio
        this.nomeArmadio = res.box.nome_armadio || 'Armadio sconosciuto';
      },
      error: (err: any) => console.error("Errore caricamento box:", err)
    });
  }

  caricaOggettiDalServer() {
    if (!this.boxId) return;
    this.dbService.getOggettiPerBox(Number(this.boxId)).subscribe({
      next: (res: any) => {
        this.oggetti = res.oggetti || [];
      },
      error: (err: any) => console.error("Errore caricamento oggetti:", err)
    });
  }

  // --- GESTIONE OGGETTI ---

  // FIX BUG 2: Salvataggio con distinzione tra creazione e modifica
  salvaOggetto() {
    if (!this.nuovoOggetto.nome || !this.nuovoOggetto.tipo || !this.nuovoOggetto.quantita) {
      this.mostraAlertCampi(); return;
      return;
    }

    if (this.editIndex !== null) {
      const oggettoId = this.oggetti[this.editIndex].id;
      this.dbService.aggiornaOggetto(oggettoId, this.nuovoOggetto).subscribe({
        next: () => {
          this.caricaOggettiDalServer();
          this.setOpen(false);
        },
        error: (err: any) => console.error("Errore aggiornamento oggetto:", err)
      });
    } else {
      const datiOggetto = { ...this.nuovoOggetto, rif_box: Number(this.boxId) };
      this.dbService.creaOggetto(datiOggetto).subscribe({
        next: () => {
          this.caricaOggettiDalServer();
          this.setOpen(false);
        },
        error: (err: any) => console.error("Errore salvataggio oggetto:", err)
      });
    }
  }

  apriModifica(index: number, event: Event) {
    event.stopPropagation();
    this.editIndex = index;
    this.nuovoOggetto = { ...this.oggetti[index] }; 
    this.isModalOpen = true; 
  }

  // FIX BUG 1: Eliminazione effettiva dal database
  async confermaEliminaOggetto(index: number, event: Event) {
    event.stopPropagation(); 
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Elimina',
      message: 'Vuoi rimuovere questo elemento dalla box?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            const oggettoId = this.oggetti[index].id;
            this.dbService.eliminaOggetto(oggettoId).subscribe({
              next: () => this.caricaOggettiDalServer(),
              error: (err: any) => console.error("Errore eliminazione oggetto:", err)
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
                next: () => {
                  this.caricaTipologieDalServer(); 
                  this.nuovoOggetto.tipo = data.nuovoTipo; 
                },
                error: (err: any) => console.error("Errore creazione tipologia:", err)
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // --- UI UTILITY ---

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

  // --- ALERT CAMPI OBBLIGATORI ---
  async mostraAlertCampi() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Attenzione',
      message: 'Compila tutti i campi obbligatori.',
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await alert.present();
  }

  // --- FUNZIONI PER IL QR CODE ---
  
  toggleQR() {
    this.mostraQR = !this.mostraQR;
  }

  scaricaQRCode() {
    const canvas = document.querySelector('qrcode canvas') as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const nomeScatola = this.boxCorrente ? this.boxCorrente.nome : 'Sconosciuta';
      link.download = `QR_Box_${nomeScatola}.png`; 
      link.click();
    }
  }
}