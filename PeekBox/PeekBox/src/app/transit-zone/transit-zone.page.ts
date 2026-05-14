import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  arrowForwardOutline, downloadOutline, documentTextOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database';
import { ExportService } from '../services/export';

/**
 * TransitZonePage — Riorganizza & Esporta (v2 — 2 colonne, spostamento diretto)
 * ──────────────────────────────────────────────────────────────────────────────
 * Logica semplificata: la Zona di Transito è stata rimossa.
 * L'oggetto passa direttamente da Sorgente → Destinazione e, contestualmente,
 * viene eseguita la chiamata AJAX al backend che aggiorna il DB:
 *   UPDATE Oggetto SET rif_box = ? WHERE id_ogg = ?
 *
 * Validazione bloccante: nessuno spostamento è consentito se boxDestinazioneId
 * è null/undefined — sia tramite click (→) che tramite drag & drop.
 */
@Component({
  selector: 'app-transit-zone',
  templateUrl: './transit-zone.page.html',
  styleUrls: ['./transit-zone.page.scss'],
  standalone: true,
  imports: [
    BackButtonComponent, CommonModule, FormsModule,
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

  // Oggetti nelle due colonne (niente transit intermedia)
  oggettiSorgente: any[] = [];
  oggettiDestinazione: any[] = [];

  // Stato UI
  isLoading = false;
  isSaving = false;
  draggedItem: any = null;
  dragOverZone: 'sorgente' | 'destinazione' | null = null;

  constructor(
    private dbService: DatabaseService,
    private exportService: ExportService,
    private toastCtrl: ToastController,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({
      swapHorizontalOutline, archiveOutline, checkmarkCircleOutline,
      arrowForwardOutline, downloadOutline, documentTextOutline
    });
  }

  ngOnInit() {
    this.utenteId = localStorage.getItem('utente_id');
    const boxPreselezionata = this.route.snapshot.queryParamMap.get('boxSorgenteId');
    if (boxPreselezionata) {
      this.boxSorgenteId = Number(boxPreselezionata);
    }
    if (this.utenteId) {
      this.caricaBox(this.boxSorgenteId ?? undefined);
    }
  }

  ngOnDestroy() {
    // Nessun listener touch manuale da rimuovere (gestione via template Angular)
  }

  // ─── CARICAMENTO DATI ──────────────────────────────────────

  caricaBox(preselezioneId?: number) {
    if (!this.utenteId) return;
    this.dbService.getBox(this.utenteId).subscribe({
      next: (res: any) => {
        this.tutteLeBox = res.box || [];
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
    // Se la sorgente cambia, la destinazione attuale potrebbe ora coincidere:
    // la filterizzazione del getter la esclude automaticamente.
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
      error: (err: any) => console.error('Errore caricamento destinazione:', err)
    });
  }

  // ─── VALIDAZIONE BLOCCANTE ────────────────────────────────

  /**
   * Verifica che la box destinazione sia selezionata e valida.
   * Mostra un Toast di avviso e restituisce false se non lo è.
   * Chiamare SEMPRE prima di qualsiasi spostamento (click o drop).
   */
  private async validaDestinazione(): Promise<boolean> {
    if (!this.boxDestinazioneId || isNaN(Number(this.boxDestinazioneId))) {
      await this.mostraToast(
        '⚠️ Seleziona prima una box di destinazione valida!',
        'warning'
      );
      return false;
    }
    return true;
  }

  // ─── SPOSTAMENTO DIRETTO + SALVATAGGIO IMMEDIATO ──────────

  /**
   * Spostamento tramite tasto → (click).
   * 1. Valida la destinazione (bloccante).
   * 2. Rimuove l'oggetto dalla sorgente locale.
   * 3. Chiama il backend (AJAX).
   * 4. In caso di successo aggiunge l'oggetto alla destinazione locale.
   * 5. In caso di errore ripristina l'oggetto nella sorgente.
   */
  async spostaInDestinazione(ogg: any) {
    if (!(await this.validaDestinazione())) return;
    if (this.isSaving) return;

    const idOgg = Number(ogg.id);
    if (isNaN(idOgg) || idOgg <= 0) {
      await this.mostraToast('❌ Oggetto con ID non valido.', 'danger');
      return;
    }

    // Rimuovi subito dalla sorgente (ottimistico — rollback in errore)
    const idx = this.oggettiSorgente.findIndex(o => o.id === ogg.id);
    if (idx === -1) return;
    this.oggettiSorgente.splice(idx, 1);

    this.isSaving = true;
    this.dbService.spostaOggetto(idOgg, Number(this.boxDestinazioneId)).subscribe({
      next: async () => {
        this.isSaving = false;
        // Aggiunge alla lista destinazione con badge visivo temporaneo
        const oggettoSpostato = { ...ogg, _appenaArrivato: true };
        this.oggettiDestinazione.push(oggettoSpostato);
        // Rimuove il badge dopo 3 secondi
        setTimeout(() => { oggettoSpostato._appenaArrivato = false; }, 3000);
        await this.mostraToast(`✅ "${ogg.nome}" spostato!`, 'success');
      },
      error: async (err: any) => {
        this.isSaving = false;
        // Rollback: reinserisce l'oggetto nella sorgente
        this.oggettiSorgente.splice(idx, 0, ogg);
        const serverMsg = err?.error?.error || err?.message || 'Errore sconosciuto';
        console.error('[spostaInDestinazione] Errore:', err.status, serverMsg);
        await this.mostraToast(
          `❌ Spostamento fallito (${err.status}): ${serverMsg}`,
          'danger'
        );
      }
    });
  }

  // ─── DRAG & DROP (Mouse — desktop) ────────────────────────

  onDragStart(event: DragEvent, item: any, zona: 'sorgente' | 'destinazione') {
    this.draggedItem = { item, zona };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.id));
    }
  }

  onDragOver(event: DragEvent, zona: 'sorgente' | 'destinazione') {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverZone = zona;
  }

  onDragLeave() {
    this.dragOverZone = null;
  }

  async onDrop(event: DragEvent, zonaTarget: 'sorgente' | 'destinazione') {
    event.preventDefault();
    this.dragOverZone = null;
    if (!this.draggedItem) return;
    if (this.draggedItem.zona === zonaTarget) { this.draggedItem = null; return; }

    // Blocca se destinazione non valida
    if (zonaTarget === 'destinazione' && !(await this.validaDestinazione())) {
      this.draggedItem = null;
      return;
    }

    await this.eseguiSpostamento(this.draggedItem.item, this.draggedItem.zona, zonaTarget);
    this.draggedItem = null;
  }

  // ─── TOUCH (mobile / Capacitor) ───────────────────────────

  onTouchStart(event: TouchEvent, item: any, zona: 'sorgente' | 'destinazione') {
    this.draggedItem = { item, zona };
  }

  async onTouchEnd(event: TouchEvent, _zona: 'sorgente' | 'destinazione') {
    if (!this.draggedItem) return;
    const touch = event.changedTouches[0];
    const zonaTarget = this.getZonaDalPunto(touch.clientX, touch.clientY);

    if (zonaTarget && zonaTarget !== this.draggedItem.zona) {
      if (zonaTarget === 'destinazione' && !(await this.validaDestinazione())) {
        this.draggedItem = null;
        return;
      }
      await this.eseguiSpostamento(this.draggedItem.item, this.draggedItem.zona, zonaTarget);
    }

    this.draggedItem = null;
    this.dragOverZone = null;
  }

  private getZonaDalPunto(x: number, y: number): 'sorgente' | 'destinazione' | null {
    const zone: Array<{ id: string; zona: 'sorgente' | 'destinazione' }> = [
      { id: 'zona-sorgente',     zona: 'sorgente' },
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

  /**
   * Spostamento comune usato sia dal drop che dal touch end.
   * Per ora solo Sorgente → Destinazione è supportato (il drop inverso
   * è ignorato per semplicità; si può estendere).
   */
  private async eseguiSpostamento(
    item: any,
    _zonaFrom: 'sorgente' | 'destinazione',
    zonaTo: 'sorgente' | 'destinazione'
  ) {
    if (zonaTo === 'destinazione') {
      await this.spostaInDestinazione(item);
    }
    // Se zonaTo === 'sorgente' (drag di ritorno): non fa nulla —
    // gli oggetti in destinazione sono già persistiti sul DB.
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
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
