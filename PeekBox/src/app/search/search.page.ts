import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonSearchbar, IonList, IonItem, IonLabel, IonIcon, IonBadge,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, archiveOutline, cubeOutline, home, search, person } from 'ionicons/icons';
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonSearchbar, IonList, IonItem, IonLabel, IonIcon, IonBadge,
    IonSpinner
  ]
})
export class SearchPage {

  termineDiRicerca: string = '';
  risultati: any[] = [];
  cercando: boolean = false;
  haCercato: boolean = false;
  utenteId: string | null = null;

  constructor(private dbService: DatabaseService) {
    addIcons({ searchOutline, archiveOutline, cubeOutline, home, search, person });
  }

  ionViewWillEnter() {
    this.utenteId = localStorage.getItem('utente_id');
  }

  cercaOggetti(event: any) {
    const termine = event.detail.value?.trim();
    this.termineDiRicerca = termine;

    // Resetta se la ricerca è vuota
    if (!termine || termine.length < 2) {
      this.risultati = [];
      this.haCercato = false;
      return;
    }

    this.cercando = true;
    this.haCercato = true;

    this.dbService.cercaOggetti(this.utenteId!, termine).subscribe({
      next: (res: any) => {
        this.risultati = res.risultati || [];
        this.cercando = false;
      },
      error: (err: any) => {
        console.error("Errore ricerca:", err);
        this.cercando = false;
      }
    });
  }

  pulisciRicerca() {
    this.termineDiRicerca = '';
    this.risultati = [];
    this.haCercato = false;
  }
}
