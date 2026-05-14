import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle,
  IonContent, IonButtons,
  IonButton, IonIcon, IonFooter, IonModal,
  IonCheckbox, IonRadioGroup, IonRadio,
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trashOutline, star, starOutline, home, search, searchOutline,
  person, add, filter, cubeOutline, archiveOutline, closeOutline,
  locationOutline, optionsOutline, logOutOutline, timeOutline,
  chevronForwardOutline, informationCircleOutline, arrowBackOutline,
  shareOutline, shieldCheckmarkOutline,
  scanOutline, alertCircleOutline, checkmarkCircleOutline,
  createOutline, openOutline, refreshOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  providers: [DatePipe],
  imports: [
    CommonModule, RouterModule, FormsModule,
    IonHeader, IonToolbar, IonTitle,
    IonContent, IonButtons,
    IonButton, IonIcon, IonFooter, IonModal,
    IonCheckbox, IonRadioGroup, IonRadio,
  ],
})
export class HomePage {

  leMieBox: any[] = [];
  boxFiltrate: any[] = [];
  gliArmadi: any[] = [];
  leTipologie: any[] = [];
  utenteId: string | null = null;
  nomeUtente: string = '';
  emailUtente: string = '';

  // Contatore articoli totali (somma degli oggetti in tutte le box)
  totaleArticoli: number = 0;

  // Stato modals
  isFilterModalOpen = false;

  // Scanner QR
  @ViewChild('scanVideo', { static: false }) scanVideoRef?: ElementRef<HTMLVideoElement>;
  isScanModalOpen = false;
  scanResult: string | null = null;
  scanError: string | null = null;
  private scanStream: MediaStream | null = null;
  private scanDetector: any = null;
  private scanRafId: number | null = null;

  searchQuery = '';

  filtri = {
    soloPreferiti: false,
    idArmadio: null as number | null,
    categoria: null as string | null
  };

  constructor(
    private alertCtrl: AlertController,
    private dbService: DatabaseService,
    private router: Router,
    private datePipe: DatePipe
  ) {
    addIcons({
      add, filter, home, search, searchOutline, person, star, starOutline,
      trashOutline, cubeOutline, archiveOutline, closeOutline,
      locationOutline, optionsOutline, logOutOutline, timeOutline,
      chevronForwardOutline, informationCircleOutline, arrowBackOutline,
      shareOutline, shieldCheckmarkOutline,
      scanOutline, alertCircleOutline, checkmarkCircleOutline,
      createOutline, openOutline, refreshOutline
    });
  }

  ionViewWillEnter() {
    this.utenteId = localStorage.getItem('utente_id');
    if (this.utenteId) {
      this.caricaDatiDalServer(this.utenteId);
      this.nomeUtente = (localStorage.getItem('utente_nome') || '').toUpperCase();
      this.emailUtente = localStorage.getItem('utente_email') || '';
    }
  }

  caricaDatiDalServer(idUtente: string) {
    this.dbService.getArmadi(idUtente).subscribe({
      next: (res: any) => this.gliArmadi = res.armadi || []
    });

    this.dbService.getTipologie(idUtente).subscribe({
      next: (res: any) => this.leTipologie = res.tipologie || []
    });

    this.dbService.getBox(idUtente).subscribe({
      next: (res: any) => {
        this.leMieBox = res.box || [];
        this.applicaFiltri();
        // Calcola il totale articoli (se il backend restituisce num_oggetti per box)
        this.totaleArticoli = this.leMieBox.reduce(
          (acc: number, b: any) => acc + (b.num_oggetti || 0), 0
        );
      }
    });
  }

  getNomeArmadio(id: number): string {
    const trovato = this.gliArmadi.find(a => a.id === id);
    return trovato ? trovato.nome : 'Sconosciuto';
  }

  onSearch() {
    this.applicaFiltri();
  }

  toggleSoloPreferiti() {
    this.filtri.soloPreferiti = !this.filtri.soloPreferiti;
    if (this.filtri.soloPreferiti) {
      this.filtri.idArmadio = null;
    }
    this.applicaFiltri();
  }

  filtraPerArmadio(id: number) {
    if (this.filtri.idArmadio === id) {
      this.filtri.idArmadio = null;
    } else {
      this.filtri.idArmadio = id;
      this.filtri.soloPreferiti = false;
    }
    this.applicaFiltri();
  }

  applicaFiltri() {
    const q = this.searchQuery.toLowerCase().trim();

    this.boxFiltrate = this.leMieBox.filter(box => {
      const matchPreferiti = !this.filtri.soloPreferiti || box.is_preferito === 1;
      const matchArmadio = !this.filtri.idArmadio || box.rif_armadio === this.filtri.idArmadio;

      let matchCategoria = true;
      if (this.filtri.categoria) {
        if (box.categorie_presenti) {
          const listaCategorie = box.categorie_presenti.split(',');
          matchCategoria = listaCategorie.includes(this.filtri.categoria);
        } else {
          matchCategoria = false;
        }
      }

      const matchSearch = !q || box.nome.toLowerCase().includes(q);

      return matchPreferiti && matchArmadio && matchCategoria && matchSearch;
    });
  }

  resetFiltri() {
    this.filtri = { soloPreferiti: false, idArmadio: null, categoria: null };
    this.searchQuery = '';
    this.applicaFiltri();
    this.isFilterModalOpen = false;
  }

  togglePreferito(box: any, event: Event) {
    event.stopPropagation();
    const nuovoStato = box.is_preferito === 1 ? false : true;
    this.dbService.updatePreferito(box.id, nuovoStato).subscribe({
      next: () => {
        box.is_preferito = nuovoStato ? 1 : 0;
        this.applicaFiltri();
      }
    });
  }

  async confermaEliminazione(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Conferma',
      message: 'Vuoi davvero eliminare questa box e tutto il suo contenuto?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Elimina', role: 'destructive', handler: () => this.eliminaBox(id) }
      ]
    });
    await alert.present();
  }

  eliminaBox(id: number) {
    this.dbService.eliminaBox(id).subscribe({
      next: () => {
        if (this.utenteId) this.caricaDatiDalServer(this.utenteId);
      }
    });
  }

  async confermaEliminaArmadio(armadio: any, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Elimina Armadio',
      message: `Vuoi eliminare "${armadio.nome}"? Questo cancellerà anche tutte le box al suo interno.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.dbService.eliminaArmadio(armadio.id).subscribe(() => {
              if (this.utenteId) this.caricaDatiDalServer(this.utenteId);
            });
          }
        }
      ]
    });
    await alert.present();
  }

  apriCondivisione(armadio: any, event: Event) {
    event.stopPropagation();
    this.isFilterModalOpen = false;
    this.router.navigate(['/condivisione-archivio', armadio.id], {
      queryParams: { nome: armadio.nome }
    });
  }

  apriGeofence(armadio: any, event: Event) {
    event.stopPropagation();
    this.isFilterModalOpen = false;
    this.router.navigate(['/geofence-armadio', armadio.id], {
      queryParams: { nome: armadio.nome }
    });
  }

  async confermaEliminaTipologia(tipo: any, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Elimina Categoria',
      message: `Vuoi davvero eliminare la categoria "${tipo.nome}"?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.dbService.eliminaTipologia(tipo.id).subscribe(() => {
              if (this.utenteId) this.caricaDatiDalServer(this.utenteId);
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // =====================================================
  // SCANNER QR — Apertura modale + lettura camera
  // =====================================================
  async apriScanner() {
    this.scanResult = null;
    this.scanError = null;
    this.isScanModalOpen = true;
    // Aspetta il rendering del <video> dentro l'ion-modal
    setTimeout(() => this.avviaCamera(), 350);
  }

  async avviaCamera() {
    const videoEl = this.scanVideoRef?.nativeElement;
    if (!videoEl) {
      this.scanError = 'Impossibile inizializzare la camera.';
      return;
    }

    // Verifica supporto getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.scanError = 'Camera non disponibile su questo dispositivo. Usa "Inserisci ID manualmente".';
      return;
    }

    try {
      this.scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      videoEl.srcObject = this.scanStream;
      await videoEl.play();

      // Inizializza BarcodeDetector se disponibile
      const w = window as any;
      if ('BarcodeDetector' in w) {
        try {
          this.scanDetector = new w.BarcodeDetector({ formats: ['qr_code'] });
          this.scanLoop();
        } catch {
          this.scanDetector = null;
          this.scanError = 'Lettura QR non supportata dal browser. Usa "Inserisci ID manualmente".';
        }
      } else {
        this.scanError = 'Il tuo browser non supporta la scansione automatica. Usa "Inserisci ID manualmente".';
      }
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permesso camera negato. Abilita la fotocamera nelle impostazioni del browser.'
        : 'Impossibile accedere alla camera.';
      this.scanError = msg;
    }
  }

  private scanLoop() {
    const videoEl = this.scanVideoRef?.nativeElement;
    if (!videoEl || !this.scanDetector || !this.isScanModalOpen) return;

    const tick = async () => {
      if (!this.isScanModalOpen || this.scanResult) return;
      try {
        const codes = await this.scanDetector.detect(videoEl);
        if (codes && codes.length > 0) {
          this.gestisciRisultato(codes[0].rawValue || codes[0].value || '');
          return;
        }
      } catch { /* ignora errori transitori */ }
      this.scanRafId = requestAnimationFrame(tick);
    };
    this.scanRafId = requestAnimationFrame(tick);
  }

  private gestisciRisultato(valore: string) {
    if (!valore) return;
    this.scanResult = valore.trim();
    this.fermaCamera();
  }

  private fermaCamera() {
    if (this.scanRafId !== null) {
      cancelAnimationFrame(this.scanRafId);
      this.scanRafId = null;
    }
    if (this.scanStream) {
      this.scanStream.getTracks().forEach(t => t.stop());
      this.scanStream = null;
    }
    const videoEl = this.scanVideoRef?.nativeElement;
    if (videoEl) videoEl.srcObject = null;
  }

  chiudiScanner() {
    this.fermaCamera();
    this.isScanModalOpen = false;
    this.scanResult = null;
    this.scanError = null;
  }

  riprendiScansione() {
    this.scanResult = null;
    this.scanError = null;
    setTimeout(() => this.avviaCamera(), 200);
  }

  async inserisciManuale() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Inserisci ID box',
      message: 'Digita l\'ID o l\'URL della box da aprire.',
      inputs: [{ name: 'codice', type: 'text', placeholder: 'Es: 12 o https://...?box=12' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Apri',
          handler: (data) => {
            const v = (data?.codice || '').trim();
            if (v) this.gestisciRisultato(v);
          }
        }
      ]
    });
    await alert.present();
  }

  apriRisultato() {
    if (!this.scanResult) return;
    const v = this.scanResult;
    // Prova ad estrarre l'ID box da un URL stile /scan?box=12
    let boxId: string | null = null;
    try {
      if (v.includes('http')) {
        const u = new URL(v);
        boxId = u.searchParams.get('box');
      }
    } catch { /* not a URL */ }
    if (!boxId && /^\d+$/.test(v)) boxId = v;

    this.chiudiScanner();

    if (boxId) {
      this.router.navigate(['/dettaglio-box', boxId]);
    } else {
      // Codice non riconosciuto come box PeekBox: mostra alert con valore grezzo
      this.alertCtrl.create({
        cssClass: 'peekbox-alert',
        header: 'Codice non riconosciuto',
        message: `Il codice scansionato non è una box PeekBox valida:\n\n${v}`,
        buttons: [{ text: 'OK', role: 'cancel' }]
      }).then(a => a.present());
    }
  }

  // =====================================================
  // AREA PERSONALE
  // =====================================================

  /** Naviga all'Area Personale (pagina dedicata — Sezione 5) */
  apriAreaPersonale() {
    this.router.navigateByUrl('/area-personale');
  }

  /**
   * ★ FIX: apre la box passando i queryParam corretti per le box condivise.
   * Le box condivise ricevono condivisa=true e ruolo per la modalità sola lettura.
   */
  apriBox(box: any) {
    if (box.ruolo_condivisione) {
      this.router.navigate(['/dettaglio-box', box.id], {
        queryParams: { condivisa: 'true', ruolo: box.ruolo_condivisione }
      });
    } else {
      this.router.navigate(['/dettaglio-box', box.id]);
    }
  }


  /** Chiede conferma e poi esegue il logout */
  async confermaLogout() {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Logout',
      message: 'Sei sicuro di voler uscire dal tuo account?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Esci',
          role: 'destructive',
          handler: () => this.eseguiLogout()
        }
      ]
    });
    await alert.present();
  }

  eseguiLogout() {
    localStorage.clear();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // =====================================================
  // IMMAGINI CARD (invariate)
  // =====================================================
  private readonly BOX_IMAGES = [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=80&auto=format&fit=crop',
  ];

  getBoxImage(box: any, index: number): string {
    if (box.foto_url) return box.foto_url;
    return this.BOX_IMAGES[index % this.BOX_IMAGES.length];
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop';
  }
}
