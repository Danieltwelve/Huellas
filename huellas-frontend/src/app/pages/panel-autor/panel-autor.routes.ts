import { Routes } from '@angular/router';
import { PanelAutorLayoutComponent } from './panel-autor-layout/panel-autor-layout';
import { MiPanelComponent } from './mi-panel/mi-panel.component';
import { NuevoArticuloComponent } from './nuevo-articulo/nuevo-articulo.component';
import { RecursosAutoresComponent } from './recursos-autores/recursos-autores.component';
import { CertificadosComponent } from './certificados/certificados.component';
import { TimelineEditorialComponent } from './timeline-editorial/timeline-editorial.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';
import { ConfiguracionAutorComponent } from './configuracion/configuracion.component';
import { DetalleArticuloComponent } from './detalle-articulo/detalle-articulo.component';

export const PANEL_AUTOR_ROUTES: Routes = [
  {
    path: '',
    component: PanelAutorLayoutComponent,
    children: [
      { path: '', redirectTo: 'mi-panel', pathMatch: 'full' },
      { path: 'mi-panel', component: MiPanelComponent },
      { path: 'mi-panel/articulo/:id', component: DetalleArticuloComponent },
      { path: 'nuevo-articulo', component: NuevoArticuloComponent },
      { path: 'recursos', component: RecursosAutoresComponent },
      { path: 'certificados', component: CertificadosComponent },
      { path: 'timeline', component: TimelineEditorialComponent },
      { path: 'notificaciones', component: NotificacionesComponent },
      { path: 'configuracion', component: ConfiguracionAutorComponent },
    ]
  }
];
