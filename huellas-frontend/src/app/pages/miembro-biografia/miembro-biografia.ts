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
  styleUrl: './miembro-biografia.css',
  standalone: true
})
export class MiembroBiografia implements OnInit {
  miembro: Miembro | null = null;

  // Datos del equipo (mismos que en equipo-editorial.component.ts)
  private equipoData: Miembro[] = [
    {
      id: 1,
      nombre: 'Omar Villota Pantoja',
      cargo: 'Director académico',
      especialidad: 'Doctorado en Ciencias de la Educación - Magister en Educación - Licenciado en Informática',
      descripcion: 'Es Licenciado en Informática de la Universidad de Nariño, es Magíster en Educación y además posee un doctorado en Ciencias de la Educación.',
      imagen: '/equipo/Omar.png',
      email: 'omarvillota@udenar.edu.co',
      biografia: `Es Licenciado en Informática de la Universidad de Nariño. Magíster en Educación y además posee un doctorado en Ciencias de la Educación. Actualmente es profesor hora cátedra por concurso y director del Departamento de Estudios Pedagógicos de la Universidad de Nariño, director del Grupo de Investigación GITFIM y Director académico de Huellas Revista. Ha sido investigador visitante en la Universidad de Granada, España, y ha participado en proyectos de investigación relacionados con la educación y las tecnologías digitales. Es autor de varios artículos científicos y capítulos de libros en el ámbito de la educación y las TIC.`


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
