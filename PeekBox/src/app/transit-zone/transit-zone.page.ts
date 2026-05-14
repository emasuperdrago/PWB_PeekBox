import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BackButtonComponent } from '../components/back-button/back-button.component';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonSelect, IonSelectOption,
  IonSpinner, IonBadge
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  swapHorizontalOutline, archiveOutline, checkmarkCircleOutline,
  closeCircleOutline, cubeOutline, trashOutline, refreshOutline,
  downloadOutline, documentTextOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database';
import { ExportService } from '../services/export';

/**
 * TransitZonePage — Area di Transito (Drag & Drop)
 * ─────────────────────────────────────────────────
 * Permette all'utente di:
 *  1. Selezionare una box sorgente e una box destinazione
 *  2. Trascinare (drag & drop) gli oggetti dall'elenco sorgente
 *     alla zona di transito
 *  3. Confermare lo spostamento con un'unica chiamata API asincrona
 *  4. Stampare le etichette PDF e scaricare l'inventario (CSV/JSON)
 *
 * Compatibilità: Web + Ionic/Capacitor (touch events gestiti)
 */
@Component({
  selector: 'app-transit-zone',
  templateUrl: './transit-zone.page.html',
  styleUrls: ['./transit-zone.page.scss'],
  standalone: true,
  imports: [
BackButtonComponent,     CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonSelect, IonSelectOption,
    IonSpinner, IonBadge
  ]
})
export class TransitZonePage implements OnInit, OnDestroy {

  utenteId: string | null = null;

  // Liste box disponibili
  tutteLeBox: any[] = [];

  // Selezioni correnti
  boxSorgenteId: number | null = null;
  boxDestinazioneId: number | null = null;

  // Oggetti nelle rispettive aree
  oggettiSorgente: any[] = [];
  oggettiTransit: any[] = [];   // area buffer drag & drop
  oggettiDestinazione: any[] = [];

  // Stato UI
  isLoading = false;
  isSaving = false;
  draggedItem: any = null;
  dragOverZone: 'sorgente' | 'transit' | 'destinazione' | null = null;

  // Riferimento listeners touch (cleanup su destroy)
  private touchListeners: { el: HTMLElement, type: string, fn: EventListener }[] = [];

  constructor(
    private dbService: DatabaseService,
    private exportService: ExportService,
    private toastCtrl: ToastController,
    private router: Router,
    private route: ActivatedRoute   // ★ FIX: per leggere queryParams
  ) {
    addIcons({
      swapHorizontalOutline, archiveOutline, checkmarkCircleOutline,
      closeCircleOutline, cubeOutline, trashOutline, refreshOutline,
      downloadOutline, documentTextOutline
    });
  }

  ngOnInit() {
    this.utenteId = localStorage.getItem('utente_id');
    // ★ FIX B: leggi il queryParam PRIMA di caricare le box, poi
    //          carica gli oggetti sorgente nel callback di caricaBox()
    //          invece di affidarsi a un setTimeout fragile.
    const boxPreselezionata = this.route.snapshot.queryParamMap.get('boxSorgenteId');
    if (boxPreselezionata) {
      this.boxSorgenteId = Number(boxPreselezionata);
    }
    if (this.utenteId) {
      this.caricaBox(this.boxSorgenteId ?? undefined);
    }
  }

  ngOnDestroy() {
    // Pulizia listener touch per evitare memory leak
    for (const { el, type, fn } of this.touchListeners) {
      el.removeEventListener(type, fn);
    }
  }

  // ─── CARICAMENTO DATI ──────────────────────────────────────

  caricaBox(preselezioneId?: number) {
    if (!this.utenteId) return;
    this.dbService.getBox(this.utenteId).subscribe({
      next: (res: any) => {
        this.tutteLeBox = res.box || [];
        // ★ FIX B: carica gli oggetti sorgente SOLO dopo che tutteLeBox è pronto
        if (preselezioneId && this.tutteLeBox.some(b => b.id === preselezioneId)) {
          this.caricaOggettiSorgente();
        }
      },
      error: (err: any) => console.error('Errore caricamento box:', err)
    });
  }

  get boxDisponibiliDestinazione(): any[] {
    return this.tutteLeBox.filter(b => b.id !== this.boxSorgenteId);
  }

  onBoxSorgenteChange() {
    this.oggettiSorgente = [];
    this.oggettiTransit = [];
    if (this.boxSorgenteId) {
      this.caricaOggettiSorgente();
    }
  }

  onBoxDestinazioneChange() {
    this.oggettiDestinazione = [];
    if (this.boxDestinazioneId) {
      this.caricaOggettiDestinazione();
    }
  }

  caricaOggettiSorgente() {
    if (!this.boxSorgenteId) return;
    this.isLoading = true;
    this.dbService.getOggettiPerBox(this.boxSorgenteId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.oggettiSorgente = res.oggetti || [];
      },
      error: () => { this.isLoading = false; }
    });
  }

  caricaOggettiDestinazione() {
    if (!this.boxDestinazioneId) return;
    this.dbService.getOggettiPerBox(this.boxDestinazioneId).subscribe({
      next: (res: any) => { this.oggettiDestinazione = res.oggetti || []; },
      error: (err: any) => console.error('Errore dest:', err)
    });
  }

  // ─── DRAG & DROP (Mouse — desktop) ────────────────────────

  onDragStart(event: DragEvent, item: any, zona: 'sorgente' | 'transit' | 'destinazione') {
    this.draggedItem = { item, zona };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.id));
    }
  }

  onDragOver(event: DragEvent, zona: 'sorgente' | 'transit' | 'destinazione') {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverZone = zona;
  }

  onDragLeave() {
    this.dragOverZone = null;
  }

  onDrop(event: DragEvent, zonaTarget: 'sorgente' | 'transit' | 'destinazione') {
    event.preventDefault();
    this.dragOverZone = null;
    if (!this.draggedItem) return;
    this.spostaItemTra(this.draggedItem.item, this.draggedItem.zona, zonaTarget);
    this.draggedItem = null;
  }

  // ─── TOUCH (mobile / Capacitor) ───────────────────────────

  /**
   * Gestione touch drag: al touchend confrontiamo le coordinate del
   * dito con le bounding box delle zone per determinare la destinazione.
   */
  onTouchStart(event: TouchEvent, item: any, zona: 'sorgente' | 'transit' | 'destinazione') {
    this.draggedItem = { item, zona };
  }

  onTouchEnd(event: TouchEvent, _zona: 'sorgente' | 'transit' | 'destinazione') {
    if (!this.draggedItem) return;
    const touch = event.changedTouches[0];
    const zonaTarget = this.getZonaDalPunto(touch.clientX, touch.clientY);
    if (zonaTarget && zonaTarget !== this.draggedItem.zona) {
      this.spostaItemTra(this.draggedItem.item, this.draggedItem.zona, zonaTarget);
    }
    this.draggedItem = null;
    this.dragOverZone = null;
  }

  /** Determina in quale zona si trova il punto (x, y) dello schermo. */
  private getZonaDalPunto(x: number, y: number): 'sorgente' | 'transit' | 'destinazione' | null {
    const zone: Array<{ id: string, zona: 'sorgente' | 'transit' | 'destinazione' }> = [
      { id: 'zona-sorgente', zona: 'sorgente' },
      { id: 'zona-transit', zona: 'transit' },
      { id: 'zona-destinazione', zona: 'destinazione' }
    ];
    for (const z of zone) {
      const el = document.getElementById(z.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return z.zona;
      }
    }
    return null;
  }

  // ─── LOGICA SPOSTAMENTO LOCALE ────────────────────────────

  private spostaItemTra(
    item: any,
    zonaFrom: 'sorgente' | 'transit' | 'destinazione',
    zonaTo: 'sorgente' | 'transit' | 'destinazione'
  ) {
    if (zonaFrom === zonaTo) return;

    const listaFrom = this.getListaPerZona(zonaFrom);
    const listaTo   = this.getListaPerZona(zonaTo);

    const idx = listaFrom.findIndex(o => o.id === item.id);
    if (idx === -1) return;

    listaFrom.splice(idx, 1);
    listaTo.push(item);
  }

  private getListaPerZona(zona: 'sorgente' | 'transit' | 'destinazione'): any[] {
    if (zona === 'sorgente') return this.oggettiSorgente;
    if (zona === 'transit') return this.oggettiTransit;
    return this.oggettiDestinazione;
  }

  /** Sposta rapidamente un oggetto con un click (doppio-click su mobile) */
  spostaInTransit(item: any, zona: 'sorgente' | 'destinazione') {
    this.spostaItemTra(item, zona, 'transit');
  }

  riportaInSorgente(item: any) {
    this.spostaItemTra(item, 'transit', 'sorgente');
  }

  svuotaTransit() {
    // Restituisce tutto alla sorgente
    this.oggettiSorgente.push(...this.oggettiTransit);
    this.oggettiTransit = [];
  }

  // ─── CONFERMA SPOSTAMENTO → DB ────────────────────────────

  async confermaSpostamento() {
    if (!this.boxDestinazioneId) {
      await this.mostraToast('Seleziona una box di destinazione.', 'warning');
      return;
    }
    if (this.oggettiTransit.length === 0) {
      await this.mostraToast('Trascina almeno un oggetto nella zona di transito.', 'warning');
      return;
    }
    // ★ FIX: blocca doppio-click durante il salvataggio (equivalente di preventDefault)
    if (this.isSaving) return;

    // ★ FIX A: valida gli ID prima di chiamare il service
    const ids = this.oggettiTransit
      .map(o => Number(o.id))
      .filter(id => !isNaN(id) && id > 0);

    if (ids.length !== this.oggettiTransit.length) {
      console.error('[confermaSpostamento] Alcuni oggetti hanno ID non validi:', this.oggettiTransit);
      await this.mostraToast('Errore: alcuni oggetti non hanno un ID valido.', 'danger');
      return;
    }

    const destId = Number(this.boxDestinazioneId);
    this.isSaving = true;

    // ★ FIX: la navigazione/aggiornamento UI avviene SOLO nel blocco next(),
    //        dopo che il DB ha confermato l'UPDATE — mai prima.
    this.dbService.spostaOggetti(ids, destId).subscribe({
      next: async (res: any) => {
        this.isSaving = false;
        this.oggettiTransit = [];
        // Ricarica dal server — fonte di verità unica
        this.caricaOggettiSorgente();
        this.caricaOggettiDestinazione();
        await this.mostraToast(
          `✅ ${res.spostati} oggett${res.spostati === 1 ? 'o spostato' : 'i spostati'}!`,
          'success'
        );
      },
      error: async (err: any) => {
        this.isSaving = false;
        // ★ FIX C: log e display del messaggio preciso dal server
        const serverMsg = err?.error?.error || err?.message || 'Errore sconosciuto';
        console.error('[confermaSpostamento] Errore server:', err.status, serverMsg);
        await this.mostraToast(
          `❌ Spostamento fallito (${err.status}): ${serverMsg}`,
          'danger'
        );
      }
    });
  }

  // ─── EXPORT / STAMPA ──────────────────────────────────────

  async stampaEtichette() {
    if (!this.boxSorgenteId) {
      await this.mostraToast('Seleziona prima una box sorgente.', 'warning');
      return;
    }
    try {
      await this.exportService.stampaEtichetteBox(this.boxSorgenteId);
    } catch {
      await this.mostraToast('Errore generazione etichette.', 'danger');
    }
  }

  downloadCsv() {
    if (!this.utenteId) return;
    this.exportService.downloadCsv(this.utenteId);
  }

  downloadJson() {
    if (!this.utenteId) return;
    this.exportService.downloadJson(this.utenteId);
  }

  // ─── UTILITY ──────────────────────────────────────────────

  private async mostraToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}
