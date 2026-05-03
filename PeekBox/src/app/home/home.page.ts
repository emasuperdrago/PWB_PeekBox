import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonButton, IonIcon, IonFooter 
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
// Aggiunto starOutline qui:
import { trashOutline, star, starOutline, home, search, person, add, filter } from 'ionicons/icons';

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

  constructor(private alertCtrl: AlertController) {
    // Aggiunto starOutline anche qui:
    addIcons({ add, filter, home, search, person, star, starOutline, trashOutline });
  }

  ionViewWillEnter() {
    this.leMieBox = JSON.parse(localStorage.getItem('mie_box') || '[]');
    this.gliArmadi = JSON.parse(localStorage.getItem('miei_armadi') || '[]');
  }

  getNomeArmadio(id: string): string {
    const trovato = this.gliArmadi.find(a => a.id === id);
    return trovato ? trovato.nome : 'Armadio sconosciuto';
  }

  // NUOVA FUNZIONE: Cambia lo stato dei preferiti
  togglePreferito(id: string, event: Event) {
    event.stopPropagation(); // Blocca il click, così non apri il dettaglio della box
    
    // Troviamo la box cliccata e invertiamo il suo stato "is_preferito"
    const boxIndex = this.leMieBox.findIndex(box => box.id === id);
    if (boxIndex > -1) {
      this.leMieBox[boxIndex].is_preferito = !this.leMieBox[boxIndex].is_preferito;
      
      // Salviamo la modifica nel localStorage
      localStorage.setItem('mie_box', JSON.stringify(this.leMieBox));
    }
  }

  async confermaEliminazione(id: string, event: Event) {
    event.stopPropagation(); 

    const alert = await this.alertCtrl.create({
      header: 'Conferma',
      message: 'Vuoi davvero eliminare questa box? L\'azione è irreversibile.',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.eliminaBox(id);
          }
        }
      ]
    });

    await alert.present();
  }

  eliminaBox(id: string) {
    this.leMieBox = this.leMieBox.filter(box => box.id !== id);
    localStorage.setItem('mie_box', JSON.stringify(this.leMieBox));
  }
}