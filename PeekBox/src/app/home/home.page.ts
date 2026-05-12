import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  // Immagini di qualità per le card — ruotano in base all'indice
  private readonly BOX_IMAGES = [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop',  // scatole organizzazione
    'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=400&q=80&auto=format&fit=crop',  // storage minimal
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80&auto=format&fit=crop',  // interior dark
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&auto=format&fit=crop',  // living storage
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80&auto=format&fit=crop',  // bedroom minimal
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80&auto=format&fit=crop',  // closet organized
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400&q=80&auto=format&fit=crop',  // modern storage
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80&auto=format&fit=crop',  // bedroom dark
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80&auto=format&fit=crop',  // cushions textures
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=80&auto=format&fit=crop',  // shelf books
  ];

  getBoxImage(box: any, index: number): string {
    // Se la box ha una foto personalizzata usala, altrimenti ruota le immagini default
    if (box.foto_url) return box.foto_url;
    return this.BOX_IMAGES[index % this.BOX_IMAGES.length];
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    // Fallback neutro in caso di errore di caricamento
    img.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80&auto=format&fit=crop';
  }
}
