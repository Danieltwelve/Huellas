import { Routes } from '@angular/router';
import { PanelComiteEditorialLayoutComponent } from './panel-comite-editorial-layout/panel-comite-editorial-layout.component';
import { Articulos } from '../panel-admin/articulos/articulos';
import { ArticuloComiteComponent } from './articulo-comite/articulo-comite.component';
import { RubricasComiteComponent } from './rubricas-comite/rubricas-comite.component';

export const PANEL_COMITE_EDITORIAL_ROUTES: Routes = [
  {
    path: '',
    component: PanelComiteEditorialLayoutComponent,
    children: [
      { path: '', redirectTo: 'articulos', pathMatch: 'full' },
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
    ],
  },
];
