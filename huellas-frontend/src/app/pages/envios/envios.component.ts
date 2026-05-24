import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-envios',
  templateUrl: './envios.component.html',
  styleUrls: ['./envios.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EnviosComponent {
  directrices = [
    {
      titulo: 'Formato del Manuscrito',
      requisitos: [
        'Extensión: 8,000 a 15,000 palabras',
        'Tipografía: Times New Roman, tamaño 12',
        'Espaciado: doble entre líneas',
        'Márgenes: 2.5 cm en todos los lados'
      ]
    },
    {
      titulo: 'Estructura del Artículo',
      requisitos: [
        'Título en español e inglés',
        'Resumen (150-200 palabras) en español e inglés',
        'Palabras clave (5-7) en español e inglés',
        'Introducción, Metodología, Resultados, Conclusiones',
        'Referencias bibliográficas'
      ]
    },
    {
      titulo: 'Requisitos de Calidad',
      requisitos: [
        'Originalidad: Inédito y no publicado previamente',
        'Revisión por pares: Sometido a evaluación rigurosa',
        'Citación: Utilizar formato APA 7ª edición',
        'Ética: Consentimiento informado y aprobación ética'
      ]
    },
    {
      titulo: 'Documentos Requeridos',
      requisitos: [
        'Manuscrito completo en formato .docx o .pdf',
        'Carta de presentación dirigida al Editor',
        'Declaración de originalidad firmada',
        'Datos de contacto de los autores',
        'Figuras y tablas en alta resolución'
      ]
    }
  ];

  temasEducacion = [
    {
      categoria: 'Innovación pedagógica',
      titulo: 'Aulas activas y aprendizaje significativo',
      descripcion: 'Propuestas didácticas que transforman la experiencia de clase con metodologías participativas y centradas en el estudiante.',
      enfoques: ['ABP', 'aula invertida', 'gamificación']
    },
    {
      categoria: 'Tecnología educativa',
      titulo: 'Integración de herramientas digitales',
      descripcion: 'Estudios sobre plataformas, analíticas de aprendizaje, recursos interactivos y uso pedagógico de la IA en contextos formativos.',
      enfoques: ['IA educativa', 'LMS', 'recursos interactivos']
    },
    {
      categoria: 'Inclusión',
      titulo: 'Educación inclusiva y diversidad',
      descripcion: 'Experiencias e investigaciones sobre accesibilidad, diseño universal para el aprendizaje y participación de comunidades diversas.',
      enfoques: ['DUA', 'accesibilidad', 'equidad']
    },
    {
      categoria: 'Evaluación',
      titulo: 'Evaluación formativa y retroalimentación',
      descripcion: 'Aportes sobre evaluación auténtica, rúbricas, seguimiento del aprendizaje y prácticas que acompañan el progreso del estudiante.',
      enfoques: ['rúbricas', 'retroalimentación', 'evaluación auténtica']
    },
    {
      categoria: 'Formación docente',
      titulo: 'Desarrollo profesional del profesorado',
      descripcion: 'Reflexiones y evidencias sobre actualización docente, comunidades de práctica y acompañamiento pedagógico.',
      enfoques: ['capacitación', 'mentoría', 'comunidades de práctica']
    },
    {
      categoria: 'Contexto territorial',
      titulo: 'Escuela, comunidad y territorio',
      descripcion: 'Investigaciones situadas en educación rural, vínculo con el territorio y soluciones que responden a realidades locales.',
      enfoques: ['educación rural', 'territorio', 'comunidad']
    }
  ];

  temaSeleccionado = this.temasEducacion[0];

  condiciones = [
    { condicion: '✓ Cumple', color: '#4CAF50' },
    { condicion: '✗ No cumple', color: '#f44336' },
    { condicion: '⚠ Revisar', color: '#ff9800' }
  ];
}
