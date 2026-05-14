import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
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

  constructor(private location: Location, private router: Router) {
    addIcons({ arrowBackOutline });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl(this.fallbackRoute);
    }
  }
}
