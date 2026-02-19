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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'actual', component: ActualComponent },
  {
    path: 'archivos',
    component: ArchivosComponent,
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canViewArchivos', allowedRoles: ['admin', 'editor', 'reviewer'] },
  },
  {
    path: 'envios',
    component: EnviosComponent,
    canActivate: [claimsGuard],
    data: { requiredClaim: 'canSubmitEnvios', allowedRoles: ['admin', 'author', 'teacher'] },
  },
  { path: 'avisos', component: AvisosComponent },
  { path: 'equipo-editorial', component: EquipoEditorialComponent },
  { path: 'equipo/:id', component: MiembroBiografia },
  { path: 'desarrollado-por', component: DesarrolladoPorComponent },
  { path: 'etica-publicacion', component: EticaPublicacionComponent },
  { path: 'indexacion', component: IndexacionComponent },
  { path: 'acerca-de', component: AcercaDeComponent },
  { path: '**', redirectTo: '' },
];
