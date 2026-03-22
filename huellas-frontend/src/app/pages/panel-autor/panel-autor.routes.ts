import { Routes } from '@angular/router';
import { PanelAutorLayoutComponent } from './panel-autor-layout/panel-autor-layout';
import { MiPanelComponent } from './mi-panel/mi-panel.component';
import { NuevoArticuloComponent } from './nuevo-articulo/nuevo-articulo.component';
import { RecursosAutoresComponent } from './recursos-autores/recursos-autores.component';
import { CertificadosComponent } from './certificados/certificados.component';
import { TimelineEditorialComponent } from './timeline-editorial/timeline-editorial.component';

export const PANEL_AUTOR_ROUTES: Routes = [
  {
    path: '',
    component: PanelAutorLayoutComponent,
    children: [
      { path: '', redirectTo: 'mi-panel', pathMatch: 'full' },
      { path: 'mi-panel', component: MiPanelComponent },
      { path: 'nuevo-articulo', component: NuevoArticuloComponent },
      { path: 'recursos', component: RecursosAutoresComponent },
      { path: 'certificados', component: CertificadosComponent },
      { path: 'timeline', component: TimelineEditorialComponent },
      // placeholders for notificaciones, configuracion
    ]
  }
];
