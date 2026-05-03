import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton, IonInputPasswordToggle, AlertController } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
// 1. Importiamo il service
import { DatabaseService } from '../services/database'; 

@Component({
  selector: 'app-registrazione',
  templateUrl: './registrazione.page.html',
  styleUrls: ['./registrazione.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton, CommonModule, FormsModule, RouterModule, IonInputPasswordToggle]
})
export class RegistrazionePage implements OnInit {

  nomeProfilo: string = '';
  email: string = '';
  password: string = '';

  // 2. Iniettiamo DatabaseService, Router e AlertController nel costruttore
  constructor(
    private dbService: DatabaseService, 
    private router: Router,
    private alertController: AlertController
  ) { }

  ngOnInit() { }

  // 3. Funzione per inviare i dati al Backend
  async registrati() {
    if (this.nomeProfilo && this.email && this.password) {
      
      this.dbService.registraUtente(this.nomeProfilo, this.email, this.password).subscribe({
        next: async (res: any) => {
          console.log('Risposta server:', res);
          const alert = await this.alertController.create({
            header: 'Successo!',
            message: 'Registrazione completata correttamente.',
            buttons: ['OK']
          });
          await alert.present();
          
          // Dopo il successo, mandiamo l'utente al login
          this.router.navigate(['/login']);
        },
        error: async (err) => {
          console.error('Errore:', err);
          const alert = await this.alertController.create({
            header: 'Errore',
            message: 'Impossibile registrarsi. Email già presente o server offline.',
            buttons: ['OK']
          });
          await alert.present();
        }
      });

    } else {
      const alert = await this.alertController.create({
        header: 'Attenzione',
        message: 'Tutti i campi sono obbligatori!',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}