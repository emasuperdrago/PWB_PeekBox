import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DatabaseService } from './services/database'; 

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  
  constructor(private dbService: DatabaseService) {
    this.avviaDatabase();
  }

  async avviaDatabase() {
    console.log('--- Avvio inizializzazione database PeekBox ---');
    await this.dbService.initPlugin();
    console.log('✅ App pronta e in ascolto!');
  }
}
