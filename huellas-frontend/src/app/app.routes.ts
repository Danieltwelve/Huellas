import { GestionFlujoEditorial } from './pages/panel-admin/gestion-flujo-editorial/gestion-flujo-editorial';
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ActualComponent } from './pages/actual/actual.component';
import { ArchivosComponent } from './pages/archivos/archivos.component';
import { EnviosComponent } from './pages/envios/envios.component';
import { AvisosComponent } from './pages/avisos/avisos.component';
import { EquipoEditorialComponent } from './pages/equipo-editorial/equipo-editorial.component';
import { DesarrolladoPorComponent } from './pages/desarrollado-por/desarrollado-por.component';
import { EticaPublicacionComponent } from './pages/etica-publicacion/etica-publicacion.component';
import { IndexacionComponent } from './pages/indexacion/indexacion.component';
import { AcercaDeComponent } from './pages/acerca-de/acerca-de.component';
import { MiembroBiografia } from './pages/miembro-biografia/miembro-biografia';
import { claimsGuard } from './core/auth/claims.guard';
import { redirectIfAuthenticatedGuard } from './core/auth/redirect-if-authenticated.guard';
import { GestionUsuarios } from './pages/panel-admin/gestion-usuarios/gestion-usuarios';
import { RecuperarContrasenaComponent } from './pages/login/recuperar-contraseña/recuperar-contrasena.component';
import { Articulos } from './pages/panel-admin/articulos/articulos';
import { FlujoTrabajoArticulo } from './pages/panel-admin/articulos/flujo-trabajo-articulo/flujo-trabajo-articulo';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent, canActivate: [redirectIfAuthenticatedGuard] },
  {
    path: 'recuperar-contrasena',
    component: RecuperarContrasenaComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  { path: 'register', component: RegisterComponent, canActivate: [redirectIfAuthenticatedGuard] },
  { path: 'actual', component: ActualComponent, canActivate: [redirectIfAuthenticatedGuard] },
  {
    path: 'archivos',
    component: ArchivosComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'envios',
    component: EnviosComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'gestion-usuarios',
    component: GestionUsuarios,
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageUsers', allowedRoles: ['admin'] },
  },
  {
    path: 'articulos',
    component: Articulos,
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageArticulos', allowedRoles: ['admin'] },
  },

  {
    path: 'flujo-trabajo-articulo/:id',
    component: FlujoTrabajoArticulo,
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageArticulos', allowedRoles: ['admin'] },
  },

  {
    path: 'gestion-flujo-editorial',
    component: GestionFlujoEditorial,
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canManageUsers', allowedRoles: ['admin'] },
  },
  {
    path: 'panel-autor',
    loadChildren: () => import('./pages/panel-autor/panel-autor.routes').then(m => m.PANEL_AUTOR_ROUTES),
    canActivate: [claimsGuard],
    data: { requiredClaim: 'roles', allowedRoles: ['autor', 'admin'] },
  },
  { path: 'avisos', component: AvisosComponent, canActivate: [redirectIfAuthenticatedGuard] },
  {
    path: 'equipo-editorial',
    component: EquipoEditorialComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  { path: 'equipo/:id', component: MiembroBiografia, canActivate: [redirectIfAuthenticatedGuard] },
  {
    path: 'desarrollado-por',
    component: DesarrolladoPorComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'etica-publicacion',
    component: EticaPublicacionComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'indexacion',
    component: IndexacionComponent,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  { path: 'acerca-de', component: AcercaDeComponent, canActivate: [redirectIfAuthenticatedGuard] },
  { path: '**', redirectTo: '' },
];
