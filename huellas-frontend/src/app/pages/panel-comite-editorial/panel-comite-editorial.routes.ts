import { Routes } from '@angular/router';
import { PanelComiteEditorialLayoutComponent } from './panel-comite-editorial-layout/panel-comite-editorial-layout.component';
import { Articulos } from '../panel-admin/articulos/articulos';
import { ArticuloComiteComponent } from './articulo-comite/articulo-comite.component';
import { RubricasComiteComponent } from './rubricas-comite/rubricas-comite.component';
import { DashboardComiteComponent } from './dashboard-comite/dashboard-comite.component';
import { NotificacionesComiteComponent } from './notificaciones-comite/notificaciones-comite.component';

export const PANEL_COMITE_EDITORIAL_ROUTES: Routes = [
  {
    path: '',
    component: PanelComiteEditorialLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: DashboardComiteComponent,
      },
      {
        path: 'articulos',
        component: Articulos,
        data: { committeeView: true },
      },
      {
        path: 'articulos/:id',
        component: ArticuloComiteComponent,
      },
      {
        path: 'rubricas',
        component: RubricasComiteComponent,
      },
      {
        path: 'notificaciones',
        component: NotificacionesComiteComponent,
      },
    ],
  },
];
