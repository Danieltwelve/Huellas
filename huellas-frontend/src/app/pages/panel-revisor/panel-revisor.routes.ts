import { Routes } from '@angular/router';
import { PanelRevisorLayoutComponent } from './panel-revisor-layout/panel-revisor-layout.component';
import { ResumenRevisorComponent } from './resumen-revisor/resumen-revisor.component';
import { ArticulosAsignadosComponent } from './articulos-asignados/articulos-asignados.component';
import { RealizarRevisionComponent } from './realizar-revision/realizar-revision.component';
import { HistorialRevisionesComponent } from './historial-revisiones/historial-revisiones.component';
import { PlazoRevisionComponent } from './plazo-revision/plazo-revision.component';
import { NotificacionesRevisorComponent } from './notificaciones-revisor/notificaciones-revisor.component';
import { GuiasRevisionComponent } from './guias-revision/guias-revision.component';
import { PerfilRevisorComponent } from './perfil-revisor/perfil-revisor.component';
import { ConfiguracionRevisorComponent } from './configuracion/configuracion.component';

export const PANEL_REVISOR_ROUTES: Routes = [
  {
    path: '',
    component: PanelRevisorLayoutComponent,
    children: [
      { path: '', redirectTo: 'resumen', pathMatch: 'full' },
      { path: 'resumen', component: ResumenRevisorComponent },
      { path: 'articulos-asignados', component: ArticulosAsignadosComponent },
      { path: 'realizar-revision', component: RealizarRevisionComponent },
      { path: 'historial', component: HistorialRevisionesComponent },
      { path: 'plazo', component: PlazoRevisionComponent },
      { path: 'notificaciones', component: NotificacionesRevisorComponent },
      { path: 'guias', component: GuiasRevisionComponent },
      { path: 'perfil', component: PerfilRevisorComponent },
      { path: 'configuracion', component: ConfiguracionRevisorComponent },
    ],
  },
];
