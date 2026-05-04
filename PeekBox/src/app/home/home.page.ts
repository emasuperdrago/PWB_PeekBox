import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonButton, IonIcon, IonFooter 
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline, star, starOutline, home, search, person, add, filter } from 'ionicons/icons';

// 1. Importiamo il nostro messaggero
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonFooter],
})
export class HomePage {
  
  leMieBox: any[] = [];
  gliArmadi: any[] = [];

  // 2. Iniettiamo il service nel costruttore
  constructor(
    private alertCtrl: AlertController,
    private dbService: DatabaseService
  ) {
    addIcons({ add, filter, home, search, person, star, starOutline, trashOutline });
  }

  // 3. Modifichiamo ionViewWillEnter (che parte ogni volta che apri la pagina)
  ionViewWillEnter() {
    // Leggiamo chi è l'utente che ha appena fatto il login
    const utenteId = localStorage.getItem('utente_id');

    if (utenteId) {
      this.caricaDatiDalServer(utenteId);
    } else {
      console.error('Nessun utente loggato! (Torna al login)');
      // In futuro qui potresti usare this.router.navigate(['/login'])
    }
  }

  // 4. Nuova funzione che usa il backend
  caricaDatiDalServer(idUtente: string) {
    // Scarichiamo gli armadi
    this.dbService.getArmadi(idUtente).subscribe({
      next: (res: any) => {
        this.gliArmadi = res.armadi || [];
        console.log('Armadi caricati:', this.gliArmadi);
      },
      error: (err) => console.error('Errore caricamento armadi:', err)
    });

    // Scarichiamo le box
    this.dbService.getBox(idUtente).subscribe({
      next: (res: any) => {
        this.leMieBox = res.box || [];
        console.log('Box caricate:', this.leMieBox);
      },
      error: (err) => console.error('Errore caricamento box:', err)
    });
  }

  getNomeArmadio(id: number): string {
    const trovato = this.gliArmadi.find(a => a.id === id); // Assicurati di usare l'id numerico
    return trovato ? trovato.nome : 'Armadio sconosciuto';
  }

  // --- LE SEGUENTI FUNZIONI (preferiti, elimina) AL MOMENTO LE LASCIAMO COSÌ,
  // Le aggiorneremo al prossimo giro per renderle Full-Stack ---

  togglePreferito(id: string, event: Event) {
    event.stopPropagation(); 
    // [Da implementare sul server]
    console.log("TODO: Aggiornare preferito sul server per la box:", id);
  }

  async confermaEliminazione(id: string, event: Event) {
    event.stopPropagation(); 
    const alert = await this.alertCtrl.create({
      header: 'Conferma',
      message: 'Vuoi davvero eliminare questa box?',
      buttons: [
        { text: 'Annulla', role: 'cancel', cssClass: 'secondary' },
        { text: 'Elimina', role: 'destructive', handler: () => { this.eliminaBox(id); } }
      ]
    });
    await alert.present();
  }

  eliminaBox(id: string) {
    // [Da implementare sul server]
    console.log("TODO: Eliminare box sul server con id:", id);
  }
}