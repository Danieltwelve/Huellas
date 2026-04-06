import { Routes } from '@angular/router';
import { claimsGuard } from './core/auth/claims.guard';
import { redirectIfAuthenticatedGuard } from './core/auth/redirect-if-authenticated.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./pages/login/recuperar-contraseña/recuperar-contrasena.component').then(
        m => m.RecuperarContrasenaComponent,
      ),
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [redirectIfAuthenticatedGuard],
  },
  { path: 'actual', loadComponent: () => import('./pages/actual/actual.component').then(m => m.ActualComponent) },
  {
    path: 'archivos',
    loadComponent: () => import('./pages/archivos/archivos.component').then(m => m.ArchivosComponent),
  },
  {
    path: 'envios',
    loadComponent: () => import('./pages/envios/envios.component').then(m => m.EnviosComponent),
  },
  {
    path: 'gestion-usuarios',
    loadComponent: () =>
      import('./pages/panel-admin/gestion-usuarios/gestion-usuarios').then(m => m.GestionUsuarios),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageUsers', allowedRoles: ['admin'] },
  },
  {
    path: 'articulos',
    loadComponent: () => import('./pages/panel-admin/articulos/articulos').then(m => m.Articulos),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageArticulos', allowedRoles: ['admin'] },
  },

  {
    path: 'flujo-trabajo-articulo/:id',
    loadComponent: () =>
      import('./pages/panel-admin/articulos/flujo-trabajo-articulo/flujo-trabajo-articulo').then(
        m => m.FlujoTrabajoArticulo,
      ),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageArticulos', allowedRoles: ['admin'] },
  },

  {
    path: 'gestion-flujo-editorial',
    loadComponent: () =>
      import('./pages/panel-admin/gestion-flujo-editorial/gestion-flujo-editorial').then(
        m => m.GestionFlujoEditorial,
      ),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageUsers', allowedRoles: ['admin'] },
  },
  {
    path: 'panel-autor',
    loadChildren: () => import('./pages/panel-autor/panel-autor.routes').then(m => m.PANEL_AUTOR_ROUTES),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'roles', allowedRoles: ['autor', 'admin'] },
  },
  {
    path: 'panel-revisor',
    loadChildren: () => import('./pages/panel-revisor/panel-revisor.routes').then(m => m.PANEL_REVISOR_ROUTES),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'roles', allowedRoles: ['revisor', 'admin'] },
  },
  { path: 'avisos', loadComponent: () => import('./pages/avisos/avisos.component').then(m => m.AvisosComponent) },
  {
    path: 'equipo-editorial',
    loadComponent: () =>
      import('./pages/equipo-editorial/equipo-editorial.component').then(m => m.EquipoEditorialComponent),
  },
  {
    path: 'equipo/:id',
    loadComponent: () => import('./pages/miembro-biografia/miembro-biografia').then(m => m.MiembroBiografia),
  },
  {
    path: 'desarrollado-por',
    loadComponent: () =>
      import('./pages/desarrollado-por/desarrollado-por.component').then(m => m.DesarrolladoPorComponent),
  },
  {
    path: 'etica-publicacion',
    loadComponent: () =>
      import('./pages/etica-publicacion/etica-publicacion.component').then(m => m.EticaPublicacionComponent),
  },
  {
    path: 'indexacion',
    loadComponent: () => import('./pages/indexacion/indexacion.component').then(m => m.IndexacionComponent),
  },
  {
    path: 'acerca-de',
    loadComponent: () => import('./pages/acerca-de/acerca-de.component').then(m => m.AcercaDeComponent),
  },
  { path: '**', redirectTo: '' },
];
