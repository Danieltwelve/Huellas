import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Miembro {
  id: number;
  nombre: string;
  cargo: string;
  especialidad: string;
  descripcion: string;
  imagen: string;
  email: string;
  biografia: string;
}

@Component({
  selector: 'app-miembro-biografia',
  imports: [CommonModule, RouterLink],
  templateUrl: './miembro-biografia.html',
  styleUrl: './miembro-biografia.scss',
  standalone: true
})
export class MiembroBiografia implements OnInit {
  miembro: Miembro | null = null;

  // Datos del equipo (mismos que en equipo-editorial.component.ts)
  private equipoData: Miembro[] = [
    {
      id: 1,
      nombre: 'Omar Villota Pantoja',
      cargo: 'Director editorial',
      especialidad: 'Colombiano',
      descripcion: 'Es ingeniero civil de la Escuela de Ingeniería de Antioquia, cuenta con un MBA con énfasis en Finanzas de Boston University Graduate School of Management.',
      imagen: '/equipo/Omar.png',
      email: 'ricardo.jaramillo@huellas-revista.com',
      biografia: `Es ingeniero civil de la Escuela de Ingeniería de Antioquia, cuenta con un MBA con énfasis en Finanzas de Boston University Graduate School of Management.

Actualmente, se desempeña como Presidente de Grupo Sura, holding del Conglomerado Financiero Sura – Bancolombia. Antes, se desempeñó como Vicepresidente de Desarrollo de Negocios y Finanzas de Grupo Sura. Previamente, estuvo vinculado a Banca de Inversión Bancolombia en los cargos de Presidente, Vicepresidente de Finanzas y Gerente de Proyectos, y a Fiduciaria Bancolombia.

Hace parte como miembro de las juntas directivas de Suramericana, SURA Asset Management, Grupo Argos, así como de los consejos directivos de la Asociación Medellín Cultural, Orquesta Filarmónica de Medellín, y del Consejo Superior de la Universidad EIA. Previamente, hizo parte de las juntas directivas de ARUS y Renting Colombia.`
    },
    {
      id: 2,
      nombre: 'Juan Esteban Toro Valencia',
      cargo: 'Miembro Patrimonial bajo legislación colombiana, miembro independiente bajo estándares Dow Jones',
      especialidad: '',
      descripcion: '',
      imagen: '/equipo/Omar.png',
      email: 'juan.toro@huellas-revista.com',
      biografia: `Miembro destacado de la junta directiva con amplia experiencia en el sector empresarial colombiano.

Su trayectoria profesional ha estado marcada por su compromiso con el desarrollo sostenible y la responsabilidad corporativa.`
    },
    {
      id: 3,
      nombre: 'María Angelica Arbeláez Restrepo',
      cargo: 'Miembro independiente',
      especialidad: '',
      descripcion: '',
      imagen: '/equipo/Omar.png',
      email: 'maria.arbelaez@huellas-revista.com',
      biografia: `Profesional con amplia experiencia en gestión empresarial y gobierno corporativo.

Ha contribuido significativamente al desarrollo de políticas empresariales responsables y sostenibles.`
    },
    {
      id: 4,
      nombre: 'Luis Fernando Restrepo Echavarría',
      cargo: 'Presidente de Junta Directiva-Miembro no independiente bajo legislación colombiana, miembro independiente bajo estándares Dow Jones',
      especialidad: '',
      descripcion: '',
      imagen: '/equipo/Omar.png',
      email: 'luis.restrepo@huellas-revista.com',
      biografia: `Líder empresarial con destacada trayectoria en el sector corporativo colombiano.

Como Presidente de la Junta Directiva, ha guiado importantes iniciativas estratégicas y ha promovido prácticas de buen gobierno corporativo.`
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numericId = parseInt(id, 10);
      this.miembro = this.equipoData.find(m => m.id === numericId) || null;
      if (!this.miembro) {
        // Si no se encuentra el miembro, redirigir al equipo editorial
        this.router.navigate(['/equipo-editorial']);
      }
    }
  }

  getBiografiaParrafos(): string[] {
    if (!this.miembro) return [];
    return this.miembro.biografia.split('\n\n').filter(p => p.trim().length > 0);
  }
}
