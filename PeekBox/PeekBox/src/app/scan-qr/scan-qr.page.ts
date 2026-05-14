import { Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonContent, IonFooter, IonIcon } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, qrCode, scanOutline, cameraOutline, stopCircleOutline,
  checkmarkCircle, alertCircleOutline, arrowForwardOutline, arrowBackOutline,
  cubeOutline, home, search, person, chevronForwardOutline, refreshOutline,
  downloadOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';

declare const jsQR: any;

type Stato = 'idle' | 'scanning' | 'trovata' | 'errore';

interface CronologiaItem {
  id: number;
  nome: string;
  ora: string;
}

@Component({
  selector: 'app-scan-qr',
  templateUrl: './scan-qr.page.html',
  styleUrls: ['./scan-qr.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent, IonFooter, IonIcon],
})
export class ScanQrPage implements OnDestroy {
  @ViewChild('videoEl') videoElRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasElRef!: ElementRef<HTMLCanvasElement>;

  stato: Stato = 'idle';
  messaggioErrore = '';
  risultatoId: number | null = null;
  risultatoNome = '';
  inputManuale: number | null = null;
  cronologia: CronologiaItem[] = [];

  private stream: MediaStream | null = null;
  private rafId: number | null = null;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private zone: NgZone,
    private alertCtrl: AlertController
  ) {
    addIcons({
      qrCodeOutline, qrCode, scanOutline, cameraOutline, stopCircleOutline,
      checkmarkCircle, alertCircleOutline, arrowForwardOutline, arrowBackOutline,
      cubeOutline, home, search, person, chevronForwardOutline, refreshOutline,
      downloadOutline
    });
    this.caricaCronologia();
  }

  ngOnDestroy() { this.fermaStream(); }

  async iniziaScansione() {
    this.stato = 'scanning';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = this.videoElRef.nativeElement;
      video.srcObject = this.stream;
      video.setAttribute('playsinline', 'true');
      video.play();
      this.rafId = requestAnimationFrame(() => this.tick());
    } catch (err) {
      this.stato = 'errore';
      this.messaggioErrore = "Impossibile accedere alla fotocamera.";
    }
  }

  tick() {
    const video = this.videoElRef.nativeElement;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = this.canvasElRef.nativeElement;
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code) {
          this.fermaStream();
          this.gestisciRisultato(code.data);
          return;
        }
      }
    }
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  async gestisciRisultato(data: string) {
    const id = parseInt(data);
    if (isNaN(id)) {
      this.zone.run(() => { this.stato = 'errore'; this.messaggioErrore = "QR non valido."; });
      return;
    }
    try {
      const box = await this.db.getBoxById(id);
      this.zone.run(() => {
        if (box) {
          this.stato = 'trovata';
          this.risultatoId = box.id_box;
          this.risultatoNome = box.nome;
          this.aggiungiCronologia({ id: box.id_box, nome: box.nome });
        } else {
          this.stato = 'errore';
          this.messaggioErrore = `Box con ID ${id} non trovata.`;
        }
      });
    } catch (err) {
      this.zone.run(() => { this.stato = 'errore'; this.messaggioErrore = "Errore database."; });
    }
  }

  vaiADettaglio() { if (this.risultatoId) this.router.navigate(['/dettaglio-box', this.risultatoId]); }

  cercaManualmente() { if (this.inputManuale) this.gestisciRisultato(this.inputManuale.toString()); }

  reset() { this.fermaStream(); this.stato = 'idle'; this.messaggioErrore = ''; this.risultatoId = null; }

  fermaScanner() { this.fermaStream(); if (this.stato === 'scanning') this.stato = 'idle'; }

  private fermaStream() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  private aggiungiCronologia(item: { id: number; nome: string }) {
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    this.cronologia = [{ ...item, ora }, ...this.cronologia.filter(c => c.id !== item.id)].slice(0, 5);
    localStorage.setItem('scan_cronologia', JSON.stringify(this.cronologia));
  }

  private caricaCronologia() {
    const saved = localStorage.getItem('scan_cronologia');
    if (saved) this.cronologia = JSON.parse(saved);
  }

  svuotaCronologia() { this.cronologia = []; localStorage.removeItem('scan_cronologia'); }

  apriBoxDaCronologia(item: CronologiaItem) { this.router.navigate(['/dettaglio-box', item.id]); }
}