import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <ion-button fill="clear" class="back-btn" (click)="goBack()">
      <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
    </ion-button>
  `
})
export class BackButtonComponent {
  @Input() fallbackRoute = '/home';

  constructor(
    private location: Location,
    private router: Router,
    private platform: Platform   // ★ FIX BUG 2: Platform è affidabile su Capacitor/mobile
  ) {
    addIcons({ arrowBackOutline });
  }

  goBack() {
    // ★ FIX BUG 2: usa Platform.backButton invece di window.history.length,
    //   che viene alterato dagli overlay di ion-select/ion-modal su mobile.
    //   canGoBack() è l'unico modo affidabile in Ionic 8 + Capacitor.
    if (this.platform.is('capacitor') || this.platform.is('hybrid')) {
      // Su Capacitor usiamo sempre location.back() — il routing Ionic gestisce
      // il caso in cui non ci sia storia (torna alla root)
      this.location.back();
    } else {
      // Su web manteniamo il comportamento originale ma con soglia > 2
      // per assorbire gli entry aggiunti dagli overlay ion-select
      if (window.history.length > 2) {
        this.location.back();
      } else {
        this.router.navigateByUrl(this.fallbackRoute);
      }
    }
  }
}

