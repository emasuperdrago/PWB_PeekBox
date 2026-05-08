import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'benvenuto',
    pathMatch: 'full',
  },
  {
    path: 'benvenuto',
    loadComponent: () => import('./benvenuto/benvenuto.page').then(m => m.BenvenutoPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'registrazione',
    loadComponent: () => import('./registrazione/registrazione.page').then( m => m.RegistrazionePage)
  },
  {
    path: 'crea-box',
    loadComponent: () => import('./crea-box/crea-box.page').then( m => m.CreaBoxPage)
  },
  {
    path: 'dettaglio-box/:id',
    loadComponent: () => import('./dettaglio-box/dettaglio-box.page').then( m => m.DettaglioBoxPage)
  },
  {
    path: 'search',
    loadComponent: () => import('./search/search.page').then( m => m.SearchPage)
  },
];
