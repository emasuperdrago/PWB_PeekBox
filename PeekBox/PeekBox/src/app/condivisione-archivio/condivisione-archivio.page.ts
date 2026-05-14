import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonIcon, IonList, IonItem, IonLabel,
  IonBadge, IonSelect, IonSelectOption, IonSpinner, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonInput,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../components/back-button/back-button.component';
import { addIcons } from 'ionicons';
import {
  shareOutline, personAddOutline, trashOutline,
  eyeOutline, createOutline, peopleOutline
} from 'ionicons/icons';
import { DatabaseService } from '../services/database';

/**
 * CondivisioneArchivioPage
 * ─────────────────────────
 * Gestione RBAC per un archivio: il proprietario può invitare altri
 * utenti per email assegnando il ruolo 'viewer' (sola lettura) o
 * 'editor' (co-gestione completa). Mostra la lista degli ospiti correnti
 * e permette la revoca dell'accesso.
 */
@Component({
  selector: 'app-condivisione-archivio',
  templateUrl: './condivisione-archivio.page.html',
  styleUrls: ['./condivisione-archivio.page.scss'],
  standalone: true,
  imports: [
BackButtonComponent,     CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonList, IonItem, IonLabel,
    IonBadge, IonSelect, IonSelectOption, IonSpinner, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonInput
  ]
})
export class CondivisioneArchivioPage implements OnInit {

  armadioId!: number;
  armadioNome: string = '';

  emailOspite: string = '';
  ruoloSelezionato: 'viewer' | 'editor' = 'viewer';

  condivisioni: any[] = [];
  archividCondivisiConMe: any[] = [];

  isLoading = false;
  isInviting = false;
  utenteId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private dbService: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ shareOutline, personAddOutline, trashOutline, eyeOutline, createOutline, peopleOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.armadioId = id ? Number(id) : 0;
    this.armadioNome = this.route.snapshot.queryParamMap.get('nome') || `Archivio #${this.armadioId}`;
    this.utenteId = localStorage.getItem('utente_id');
    this.caricaCondivisioni();
    this.caricaArchividCondivisiConMe();
  }

  caricaCondivisioni() {
    if (!this.armadioId) return;
    this.isLoading = true;
    this.dbService.getCondivisioniArchivio(this.armadioId).subscribe({
      next: (res: any) => {
        this.condivisioni = res.condivisioni || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  caricaArchividCondivisiConMe() {
    if (!this.utenteId) return;
    this.dbService.getArchividCondivisiConMe(this.utenteId).subscribe({
      next: (res: any) => { this.archividCondivisiConMe = res.archivi_condivisi || []; },
      error: () => {}
    });
  }

  async invitaOspite() {
    if (!this.emailOspite.trim()) {
      await this.mostraToast('Inserisci un\'email valida.', 'warning');
      return;
    }
    this.isInviting = true;
    this.dbService.condividiArchivio(this.armadioId, this.emailOspite.trim(), this.ruoloSelezionato).subscribe({
      next: async (res: any) => {
        this.isInviting = false;
        this.emailOspite = '';
        this.caricaCondivisioni();
        await this.mostraToast(res.message, 'success');
      },
      error: async (err: any) => {
        this.isInviting = false;
        const msg = err.error?.error || 'Errore durante la condivisione.';
        await this.mostraToast(msg, 'danger');
      }
    });
  }

  async confermaRevoca(condivisione: any) {
    const alert = await this.alertCtrl.create({
      cssClass: 'peekbox-alert',
      header: 'Revocare accesso?',
      message: `Rimuovere l'accesso di ${condivisione.ospite_username} a questo archivio?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Revoca',
          role: 'destructive',
          handler: () => {
            this.dbService.revocaCondivisione(condivisione.id).subscribe({
              next: async () => {
                this.caricaCondivisioni();
                await this.mostraToast('Accesso revocato.', 'medium');
              },
              error: async () => { await this.mostraToast('Errore durante la revoca.', 'danger'); }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  ruoloBadgeColor(ruolo: string): string {
    return ruolo === 'editor' ? 'success' : 'primary';
  }

  ruoloLabel(ruolo: string): string {
    return ruolo === 'editor' ? 'Editor' : 'Visualizzatore';
  }

  formatData(ts: string): string {
    return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private async mostraToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}
