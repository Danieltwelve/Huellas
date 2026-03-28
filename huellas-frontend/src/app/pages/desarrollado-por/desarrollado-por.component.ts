import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-desarrollado-por',
  templateUrl: './desarrollado-por.component.html',
  styleUrls: ['./desarrollado-por.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class DesarrolladoPorComponent {
  tecnologias = [
    {
      nombre: 'Angular',
      capa: 'Frontend',
      descripcion: 'Interfaz moderna, modular y responsiva para una experiencia de publicación clara y fluida.',
    },
    {
      nombre: 'NestJS',
      capa: 'Backend',
      descripcion: 'API robusta para autenticación, flujo editorial y gestión de datos académicos.',
    },
    {
      nombre: 'Docker',
      capa: 'DevOps',
      descripcion: 'Contenerización para despliegues consistentes y entornos estables en cada etapa del proyecto.',
    },
    {
      nombre: 'PostgreSQL',
      capa: 'Base de Datos',
      descripcion: 'Motor relacional para persistencia segura, integridad de datos y consultas eficientes.',
    },
  ];

  desarrolladores = [
    {
      nombre: 'Juan Daniel Ortega Rojas',
      rol: 'Desarrollador Web',
     
    },
    {
      nombre: 'Juan Sebastian Cabrera Bolaños',
      rol: 'Desarrollador Web',
    },
  ];

  asesora = {
    nombre: 'Mg Sandra Vallejo Chamorro',
    rol: 'Asesora del Proyecto',
    aporte: 'Acompañamiento académico y estratégico para consolidar la visión de Revista Huellas.',
  };

  hitos = [
    {
      etapa: 'Planeación',
      descripcion: 'Definición de estructura editorial, requisitos funcionales y alcance tecnológico.',
    },
    {
      etapa: 'Desarrollo Full Stack',
      descripcion: 'Construcción de frontend en Angular y backend en NestJS para el flujo completo de la revista.',
    },
    {
      etapa: 'Contenerización y Entrega',
      descripcion: 'Configuración con Docker para despliegue consistente y evolución controlada del sistema.',
    },
  ];

  aspectosClave = [
    {
      titulo: 'Seguridad y Acceso',
      detalle: 'Autenticación y control de acceso por perfiles para proteger flujos editoriales.',
    },
    {
      titulo: 'Escalabilidad',
      detalle: 'Arquitectura modular para crecer en funcionalidades sin comprometer estabilidad.',
    },
    {
      titulo: 'Mantenibilidad',
      detalle: 'Separación clara entre frontend, backend y datos para facilitar evolución del proyecto.',
    },
    {
      titulo: 'Despliegue Consistente',
      detalle: 'Uso de Docker para reducir diferencias entre entornos de desarrollo y producción.',
    },
  ];
}
