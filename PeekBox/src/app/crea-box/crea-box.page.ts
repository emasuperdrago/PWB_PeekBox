import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonInput, IonItem, IonSelect, IonSelectOption, 
  IonButton, IonToggle, AlertController 
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database';

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
  armadi_disponibili: any[] = [];
  utenteId: string = '';

  constructor(
    private alertController: AlertController, 
    private router: Router,
    private dbService: DatabaseService
  ) { }

  ngOnInit() {
    this.utenteId = localStorage.getItem('utente_id') || '';
    if (this.utenteId) {
      this.caricaArmadi();
    }
  }

  caricaArmadi() {
    this.dbService.getArmadi(this.utenteId).subscribe({
      next: (res: any) => { this.armadi_disponibili = res.armadi || []; },
      error: (err: any) => console.error(err)
    });
  }

  async aggiungiArmadio(event: Event) {
    event.preventDefault(); 
    const alert = await this.alertController.create({
      header: 'Nuovo Armadio',
      inputs: [{ name: 'nome_armadio', type: 'text', placeholder: 'Es. Ripostiglio' }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Aggiungi', handler: (dati) => {
            if (dati.nome_armadio?.trim()) {
              this.dbService.creaArmadio(dati.nome_armadio.trim(), this.utenteId).subscribe({
                next: (res: any) => {
                  this.caricaArmadi();
                  this.rif_armadio = res.id.toString();
                },
                error: (err: any) => console.error(err)
              });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  salvaNuovaBox() {
    if (!this.nome_box || !this.rif_armadio) return;
    this.dbService.creaBox(this.nome_box, this.rif_armadio, this.is_preferito).subscribe({
      next: () => { this.router.navigate(['/home']); },
      error: (err: any) => console.error(err)
    });
  }
}