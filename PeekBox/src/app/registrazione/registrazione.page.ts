import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonInput, IonInputPasswordToggle, AlertController } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { DatabaseService } from '../services/database';

@Component({
  selector: 'app-registrazione',
  templateUrl: './registrazione.page.html',
  styleUrls: ['./registrazione.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, CommonModule, FormsModule, RouterModule, IonInputPasswordToggle]
})
export class RegistrazionePage implements OnInit, OnDestroy {

  nomeProfilo: string = '';
  email: string = '';
  password: string = '';
  tipoProfilo: 'personal' | 'business' = 'personal';

  slideSrcs: string[] = [
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1400&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1174&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1400&q=80&auto=format&fit=crop',
  ];
  currentSlide: number = 0;
  private slideInterval: any;

  constructor(
    private dbService: DatabaseService,
    private router: Router,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.startSlideshow();
  }

  ngOnDestroy() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  startSlideshow() {
    this.slideInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slideSrcs.length;
    }, 5000);
  }

  selezionaProfilo(tipo: 'personal' | 'business') {
    this.tipoProfilo = tipo;
  }

  async registrati() {
    if (!this.nomeProfilo || !this.email || !this.password) {
      const alert = await this.alertController.create({
        cssClass: 'peekbox-alert',
        header: 'Attenzione',
        message: 'Tutti i campi sono obbligatori!',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.dbService.registraUtente(this.nomeProfilo, this.email, this.password, this.tipoProfilo).subscribe({
      next: async (res: any) => {
        const alert = await this.alertController.create({
          cssClass: 'peekbox-alert',
          header: 'Benvenuto!',
          message: `Account ${this.tipoProfilo === 'business' ? 'Business' : 'Personale'} creato con successo.`,
          buttons: [{
            text: 'Accedi',
            handler: () => { this.router.navigate(['/login']); }
          }]
        });
        await alert.present();
      },
      error: async (err) => {
        const alert = await this.alertController.create({
          cssClass: 'peekbox-alert',
          header: 'Errore',
          message: 'Impossibile registrarsi. Email già presente o server offline.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }
}
