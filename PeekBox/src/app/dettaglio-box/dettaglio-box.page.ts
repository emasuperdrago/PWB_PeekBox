import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

// Import di tutte le icone usate nella pagina
import { addIcons } from 'ionicons';
import { 
  add, 
  camera, 
  archiveOutline, 
  addCircleOutline, 
  trashOutline, 
  imageOutline, 
  cubeOutline,
  createOutline
} from 'ionicons/icons';

// Import del Servizio Fotocamera
import { PhotoService } from '../services/photo'; 

@Component({
  selector: 'app-dettaglio-box',
  templateUrl: './dettaglio-box.page.html',
  styleUrls: ['./dettaglio-box.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DettaglioBoxPage implements OnInit {
  
  boxId: string | null = null;
  
  // Variabili per il Titolo Dinamico
  boxCorrente: any = null;
  nomeArmadio: string = '';
  
  // Variabili per i Modals
  isModalOpen = false; // Modal per creare/modificare elemento
  isDettaglioOpen = false; // Modal per visualizzare il dettaglio
  oggettoSelezionato: any = null; // Dati dell'oggetto cliccato

  // Variabile per capire se stiamo modificando un oggetto esistente
  editIndex: number | null = null;

  // Dati
  oggetti: any[] = []; 
  tipiOggetto: string[] = ['Cucina', 'Camera', 'Elettronica', 'Abbigliamento'];

  // Modello per il form
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
    public photoService: PhotoService
  ) {
    // Registriamo tutte le icone
    addIcons({ 
      add, 
      camera, 
      archiveOutline, 
      addCircleOutline, 
      trashOutline, 
      imageOutline, 
      cubeOutline,
      createOutline
    });
  }

  ngOnInit() {
    this.boxId = this.route.snapshot.paramMap.get('id');
    this.caricaInfoBox(); // Carica il nome della box e dell'armadio
  }

  // ============================================
  // LOGICA: CARICAMENTO INFO BOX
  // ============================================
  caricaInfoBox() {
    // Recuperiamo tutte le box salvate nel localStorage
    const tutteLeBox = JSON.parse(localStorage.getItem('mie_box') || '[]');
    
    // Cerchiamo la box corrente confrontando gli ID
    this.boxCorrente = tutteLeBox.find((b: any) => String(b.id) === String(this.boxId));

    // Se troviamo la box, andiamo a cercare anche il nome del suo armadio
    if (this.boxCorrente) {
      const tuttiGliArmadi = JSON.parse(localStorage.getItem('miei_armadi') || '[]');
      const armadio = tuttiGliArmadi.find((a: any) => String(a.id) === String(this.boxCorrente.rif_armadio));
      
      this.nomeArmadio = armadio ? armadio.nome : 'Armadio sconosciuto';
    }
  }

  // ============================================
  // LOGICA: GESTIONE MODAL (CREA/MODIFICA)
  // ============================================
  
  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    
    // Se chiudiamo il modal annullando, resettiamo il form
    if (!isOpen) {
      this.resetForm();
    }
  }

  // Apre il modal precompilato con i dati dell'oggetto da modificare
  apriModifica(index: number, event: Event) {
    event.stopPropagation(); // Blocca il click per non far aprire il dettaglio
    
    this.editIndex = index; // Ci ricordiamo a quale indice stiamo lavorando
    this.nuovoOggetto = { ...this.oggetti[index] }; // Copiamo i dati nel form
    
    this.isModalOpen = true; // Apriamo il modal
  }

  // Riporta il form allo stato iniziale vuoto
  resetForm() {
    this.nuovoOggetto = { 
      nome: '', 
      descrizione: '', 
      tipo: '', 
      fragile: false, 
      quantita: 1, 
      foto: null 
    };
    this.editIndex = null;
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

  async scattaFoto() {
    try {
      console.log('Apertura fotocamera...');
      const photo = await this.photoService.addNewToGallery();
      console.log('Foto acquisita con successo!');
      this.nuovoOggetto.foto = photo.webviewPath; 
    } catch (error) {
      console.error("Errore durante l'acquisizione della foto:", error);
    }
  }

  salvaOggetto() {
    if (this.nuovoOggetto.nome && this.nuovoOggetto.tipo && this.nuovoOggetto.quantita) {
      
      if (this.editIndex !== null) {
        // MODIFICA: Aggiorna l'oggetto esistente nell'array
        this.oggetti[this.editIndex] = { ...this.nuovoOggetto };
      } else {
        // CREAZIONE: Aggiungi un nuovo oggetto in fondo all'array
        this.oggetti.push({ ...this.nuovoOggetto });
      }
      
      // La chiusura richiama in automatico il resetForm()
      this.setOpen(false);
    } else {
      alert("Compila i campi obbligatori!");
    }
  }

  // ============================================
  // LOGICA: GRIGLIA OGGETTI (ELIMINA / DETTAGLIO)
  // ============================================

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

  apriDettaglio(oggetto: any) {
    this.oggettoSelezionato = oggetto;
    this.isDettaglioOpen = true;
  }

  chiudiDettaglio() {
    this.isDettaglioOpen = false;
    
    // Ritardo per permettere l'animazione di chiusura prima di svuotare i dati
    setTimeout(() => {
      this.oggettoSelezionato = null;
    }, 300);
  }
}