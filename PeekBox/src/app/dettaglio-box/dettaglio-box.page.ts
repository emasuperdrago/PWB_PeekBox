import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

import { addIcons } from 'ionicons';
import { 
  add, camera, archiveOutline, addCircleOutline, 
  trashOutline, imageOutline, cubeOutline, createOutline 
} from 'ionicons/icons';
import { PhotoService } from '../services/photo'; 
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-dettaglio-box',
  templateUrl: './dettaglio-box.page.html',
  styleUrls: ['./dettaglio-box.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
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
  // Modificato: Ora conterrà gli oggetti dal DB (con l'id e il nome)
  tipiOggetto: any[] = []; 

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
    addIcons({ add, camera, archiveOutline, addCircleOutline, trashOutline, imageOutline, cubeOutline, createOutline });
  }

  ngOnInit() {
    this.boxId = this.route.snapshot.paramMap.get('id');
    this.utenteId = localStorage.getItem('utente_id');
    
    if (this.boxId && this.utenteId) {
      this.caricaInfoBox(); 
      this.caricaOggettiDalServer();
      this.caricaTipologieDalServer(); // Carica le categorie reali all'avvio
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

  caricaInfoBox() {
    if (!this.utenteId) return;
    this.dbService.getBox(this.utenteId).subscribe({
      next: (res: any) => {
        this.boxCorrente = res.box.find((b: any) => String(b.id) === String(this.boxId));
        if (this.boxCorrente) {
          this.caricaNomeArmadio(this.boxCorrente.rif_armadio);
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  caricaNomeArmadio(armadioId: number) {
    if (!this.utenteId) return;
    this.dbService.getArmadi(this.utenteId).subscribe({
      next: (res: any) => {
        const armadio = res.armadi.find((a: any) => a.id === armadioId);
        this.nomeArmadio = armadio ? armadio.nome : 'Armadio sconosciuto';
      },
      error: (err: any) => console.error(err)
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

  salvaOggetto() {
    if (this.nuovoOggetto.nome && this.nuovoOggetto.tipo && this.nuovoOggetto.quantita) {
      const datiOggetto = { ...this.nuovoOggetto, rif_box: Number(this.boxId) };

      this.dbService.creaOggetto(datiOggetto).subscribe({
        next: () => {
          this.caricaOggettiDalServer();
          this.setOpen(false);
        },
        error: (err: any) => console.error("Errore salvataggio oggetto:", err)
      });
    } else {
      alert("Compila i campi obbligatori!");
    }
  }

  // RE-INSERITA: Risolve l'errore "Property 'apriModifica' does not exist"
  apriModifica(index: number, event: Event) {
    event.stopPropagation();
    this.editIndex = index;
    this.nuovoOggetto = { ...this.oggetti[index] }; 
    this.isModalOpen = true; 
  }

  // RE-INSERITA: Risolve l'errore "Property 'confermaEliminaOggetto' does not exist"
  async confermaEliminaOggetto(index: number, event: Event) {
    event.stopPropagation(); 
    const alert = await this.alertCtrl.create({
      header: 'Elimina',
      message: 'Vuoi rimuovere questo elemento dalla box?',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.oggetti.splice(index, 1);
          }
        }
      ]
    });
    await alert.present();
  }

  // MODIFICATA: Ora salva REALMENTE nel database
  async aggiungiNuovoTipo() {
    const alert = await this.alertCtrl.create({
      header: 'Nuova Categoria',
      inputs: [{ name: 'nuovoTipo', type: 'text', placeholder: 'Es. Utensili' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Aggiungi',
          handler: (data) => {
            if (data.nuovoTipo && this.utenteId) {
              // Salviamo nel DB!
              this.dbService.creaTipologia(data.nuovoTipo, this.utenteId).subscribe({
                next: () => {
                  this.caricaTipologieDalServer(); // Ricarica la lista dal DB
                  this.nuovoOggetto.tipo = data.nuovoTipo; // Seleziona la categoria appena creata
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
}