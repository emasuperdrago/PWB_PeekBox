import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'benvenuto', pathMatch: 'full' },
  {
    path: 'benvenuto',
    loadComponent: () => import('./benvenuto/benvenuto.page').then(m => m.BenvenutoPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'registrazione',
    loadComponent: () => import('./registrazione/registrazione.page').then(m => m.RegistrazionePage)
  },
  {
    path: 'crea-box',
    loadComponent: () => import('./crea-box/crea-box.page').then(m => m.CreaBoxPage)
  },
  {
    path: 'dettaglio-box/:id',
    loadComponent: () => import('./dettaglio-box/dettaglio-box.page').then(m => m.DettaglioBoxPage)
  },
  {
    path: 'search',
    loadComponent: () => import('./search/search.page').then(m => m.SearchPage)
  },
  {
    path: 'area-personale',
    loadComponent: () => import('./area-personale/area-personale.page').then(m => m.AreaPersonalePage)
  },
  // ── TRACKING GPS ────────────────────────────────────────────────────────
  {
    path: 'tracking-box/:id',
    loadComponent: () => import('./tracking-box/tracking-box.page').then(m => m.TrackingBoxPage)
  },
  // ── TRANSIT ZONE — Drag & Drop riorganizzazione + Export ────────────────
  {
    path: 'transit-zone',
    loadComponent: () => import('./transit-zone/transit-zone.page').then(m => m.TransitZonePage)
  },
  // ── CONDIVISIONE ARCHIVIO — RBAC permessi granulari ─────────────────────
  {
    path: 'condivisione-archivio/:id',
    loadComponent: () => import('./condivisione-archivio/condivisione-archivio.page').then(m => m.CondivisioneArchivioPage)
  },
  // ── GEOFENCING — Perimetro di sicurezza virtuale ─────────────────────────
  {
    path: 'geofence-armadio/:id',
    loadComponent: () => import('./geofence-armadio/geofence-armadio.page').then(m => m.GeofenceArmadioPage)
  },
  // ── ADMIN — Pannello di amministrazione ──────────────────────────────────
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.page').then(m => m.AdminPage)
  },
];
