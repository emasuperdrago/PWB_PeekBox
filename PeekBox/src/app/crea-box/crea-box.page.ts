import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonInput, IonItem, IonSelect, IonSelectOption, 
  IonButton, IonToggle, AlertController 
} from '@ionic/angular/standalone';

import { Router } from '@angular/router';

@Component({
  selector: 'app-crea-box',
  templateUrl: './crea-box.page.html',
  styleUrls: ['./crea-box.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, 
    IonButtons, IonBackButton, IonInput, IonItem, IonSelect, IonSelectOption, 
    IonButton, IonToggle
  ]
})
export class CreaBoxPage implements OnInit {

  nome_box: string = '';
  rif_armadio: string = ''; 
  descrizione: string = ''; 
  is_preferito: boolean = false;

  armadi_disponibili = [
    { id: '1', nome: 'Dispensa' },
    { id: '2', nome: 'Scaffale' },
    { id: '3', nome: ' Garage' }
  ];

  constructor(private alertController: AlertController, private router: Router) { }

  ngOnInit() {
    const armadiSalvati = localStorage.getItem('miei_armadi');
    if (armadiSalvati) {
      this.armadi_disponibili = JSON.parse(armadiSalvati);
    } else {
      localStorage.setItem('miei_armadi', JSON.stringify(this.armadi_disponibili));
    }
  }

  async aggiungiArmadio(event: Event) {
    event.preventDefault(); 
    const alert = await this.alertController.create({
      header: 'Nuovo Armadio',
      message: 'Inserisci il nome del nuovo contenitore o stanza.',
      inputs: [{ name: 'nome_armadio', type: 'text', placeholder: 'Es. Ripostiglio' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Aggiungi', handler: (dati) => {
            if (dati.nome_armadio && dati.nome_armadio.trim() !== '') {
              const nuovoId = Math.random().toString(36).substring(2, 9);
              this.armadi_disponibili.push({ id: nuovoId, nome: dati.nome_armadio.trim() });
              localStorage.setItem('miei_armadi', JSON.stringify(this.armadi_disponibili));
              this.rif_armadio = nuovoId;
            }
          }
        }
      ]
    });
    await alert.present();
  }


  salvaNuovaBox() {
    // Creiamo l'oggetto box
    const nuovaBox = {
      id: Math.random().toString(36).substring(2, 9),
      nome: this.nome_box,
      rif_armadio: this.rif_armadio,
      is_preferito: this.is_preferito
    };

    // Recuperiamo le box già salvate (se ci sono)
    let boxSalvate = JSON.parse(localStorage.getItem('mie_box') || '[]');
    
    // Aggiungiamo la nuova
    boxSalvate.push(nuovaBox);
    
    // Salviamo tutto in memoria
    localStorage.setItem('mie_box', JSON.stringify(boxSalvate));

    // Torniamo alla Home!
    this.router.navigate(['/home']);
  }

}