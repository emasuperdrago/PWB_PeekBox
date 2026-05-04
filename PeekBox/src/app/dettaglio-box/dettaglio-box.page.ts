import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

// Import icone e servizi
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
  tipiOggetto: string[] = ['Cucina', 'Camera', 'Elettronica', 'Abbigliamento'];

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
    
    if (this.boxId) {
      this.caricaInfoBox(); 
      this.caricaOggettiDalServer();
    }
  }

  // --- CARICAMENTO DATI ---

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

  // --- GESTIONE OGGETTI (CREA/MODIFICA/ELIMINA) ---

  salvaOggetto() {
    if (this.nuovoOggetto.nome && this.nuovoOggetto.tipo && this.nuovoOggetto.quantita) {
      const datiOggetto = { ...this.nuovoOggetto, rif_box: Number(this.boxId) };

      if (this.editIndex !== null) {
        console.log("Modifica non ancora implementata sul server");
      } else {
        this.dbService.creaOggetto(datiOggetto).subscribe({
          next: (res: any) => {
            this.caricaOggettiDalServer();
            this.setOpen(false);
          },
          error: (err: any) => console.error("Errore salvataggio oggetto:", err)
        });
      }
    } else {
      alert("Compila i campi obbligatori!");
    }
  }

  apriModifica(index: number, event: Event) {
    event.stopPropagation();
    this.editIndex = index;
    this.nuovoOggetto = { ...this.oggetti[index] }; 
    this.isModalOpen = true; 
  }

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
            // Qui andrà la chiamata DELETE al server
            this.oggetti.splice(index, 1);
          }
        }
      ]
    });
    await alert.present();
  }

  async aggiungiNuovoTipo() {
    const alert = await this.alertCtrl.create({
      header: 'Nuovo Tipo',
      inputs: [{ name: 'nuovoTipo', type: 'text', placeholder: 'Es. Strumenti' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Aggiungi',
          handler: (data) => {
            if (data.nuovoTipo) {
              this.tipiOggetto.push(data.nuovoTipo);
              this.nuovoOggetto.tipo = data.nuovoTipo;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // --- UTILITY E UI ---

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