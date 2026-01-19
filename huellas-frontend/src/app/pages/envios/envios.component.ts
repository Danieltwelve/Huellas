import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-envios',
  templateUrl: './envios.component.html',
  styleUrls: ['./envios.component.css'],
  standalone: true,
  imports: [CommonModule]
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

  condiciones = [
    { condicion: '✓ Cumple', color: '#4CAF50' },
    { condicion: '✗ No cumple', color: '#f44336' },
    { condicion: '⚠ Revisar', color: '#ff9800' }
  ];
}
