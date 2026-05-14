import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BackButtonComponent } from '../components/back-button/back-button.component';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton,
  IonIcon, IonList, IonBadge, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, trashOutline, createOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-condivisione-armadio',
  templateUrl: './condivisione-armadio.page.html',
  styleUrls: ['./condivisione-armadio.page.scss'],
  standalone: true,
  imports: [
BackButtonComponent,     CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton,
    IonIcon, IonList, IonBadge
  ]
})
export class CondivisioneArmadioPage implements OnInit {

  armadioId!: number;
  condivisioni: any[] = [];

  emailOspite: string = '';
  ruoloSelezionato: 'viewer' | 'editor' = 'viewer';

  constructor(
    private route: ActivatedRoute,
    private dbService: DatabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ personAddOutline, trashOutline, createOutline, shieldCheckmarkOutline });
  }

  ngOnInit() {
    this.armadioId = Number(this.route.snapshot.paramMap.get('id'));
    this.caricaCondivisioni();
  }

  caricaCondivisioni() {
    this.dbService.getCondivisioni(this.armadioId).subscribe({
      next: (res: any) => this.condivisioni = res.condivisioni || [],
      error: (err: any) => console.error(err)
    });
  }

  invita() {
    if (!this.emailOspite) return;
    this.dbService.invitaOspite(this.armadioId, this.emailOspite, this.ruoloSelezionato).subscribe({
      next: async (res: any) => {
        this.emailOspite = '';
        this.caricaCondivisioni();
        const toast = await this.toastCtrl.create({ message: res.message, duration: 2500, color: 'success' });
        toast.present();
      },
      error: async (err: any) => {
        const toast = await this.toastCtrl.create({
          message: err.error?.error || 'Errore durante la condivisione.',
          duration: 2500, color: 'danger'
        });
        toast.present();
      }
    });
  }

  async cambiaRuolo(cond: any) {
    const alert = await this.alertCtrl.create({
      header: `Modifica ruolo — ${cond.username}`,
      inputs: [
        { label: 'Viewer (sola lettura)', type: 'radio', value: 'viewer', checked: cond.ruolo === 'viewer' },
        { label: 'Editor (co-gestione)', type: 'radio', value: 'editor', checked: cond.ruolo === 'editor' }
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Salva',
          handler: (ruolo) => {
            if (!ruolo) return;
            this.dbService.aggiornaRuoloCondivisione(cond.id, ruolo).subscribe({
              next: () => this.caricaCondivisioni(),
              error: (err: any) => console.error(err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async revoca(cond: any) {
    const alert = await this.alertCtrl.create({
      header: 'Revoca accesso',
      message: `Vuoi rimuovere l\'accesso di ${cond.username}?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Revoca', role: 'destructive',
          handler: () => {
            this.dbService.revocaCondivisione(cond.id).subscribe({
              next: () => this.caricaCondivisioni(),
              error: (err: any) => console.error(err)
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
