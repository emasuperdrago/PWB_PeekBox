import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonFab, IonFabButton,
  IonButton, IonIcon, IonFooter, IonModal, IonItem,
  IonLabel, IonCheckbox, IonRadioGroup, IonRadio,
  IonAccordion, IonAccordionGroup
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  trashOutline, star, starOutline, home, search, searchOutline,
  person, add, filter, cubeOutline, archiveOutline, closeOutline,
  locationOutline, optionsOutline
} from 'ionicons/icons';

import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonFab, IonFabButton,
  IonFab, IonFabButton,
    IonButton, IonIcon, IonFooter, IonModal, IonItem,
    IonLabel, IonCheckbox, IonRadioGroup, IonRadio,
    IonAccordion, IonAccordionGroup
  ],
})
export class HomePage {

  leMieBox: any[] = [];
  boxFiltrate: any[] = [];
  gliArmadi: any[] = [];
  leTipologie: any[] = [];
  utenteId: string | null = null;
  nomeUtente: string = '';

  isFilterModalOpen = false;
  searchQuery = '';

  filtri = {
    soloPreferiti: false,
    idArmadio: null as number | null,
    categoria: null as string | null
  };

  constructor(
    private alertCtrl: AlertController,
    private dbService: DatabaseService
  ) {
    addIcons({
      add, filter, home, search, searchOutline, person, star, starOutline,
      trashOutline, cubeOutline, archiveOutline, closeOutline,
      locationOutline, optionsOutline
    });
  }

  ionViewWillEnter() {
    this.utenteId = localStorage.getItem('utente_id');
    if (this.utenteId) {
      this.caricaDatiDalServer(this.utenteId);
      this.nomeUtente = (localStorage.getItem('utente_nome') || '').toUpperCase();
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

  async confermaEliminaTipologia(tipo: any, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
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
}
