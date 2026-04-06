export type EstadoRevision = 'pendiente' | 'en-proceso' | 'enviado';

export interface ArticuloRevisor {
  id: number;
  codigo: string;
  titulo: string;
  resumen: string;
  tema: string;
  fechaAsignacion: string;
  fechaLimite: string;
  estado: EstadoRevision;
  prioridad: 'alta' | 'media' | 'baja';
  ronda: number;
}

export interface RegistroHistorialRevision {
  id: string;
  codigoArticulo: string;
  tituloArticulo: string;
  decision: 'aceptar' | 'ajustes' | 'rechazar';
  fechaEnvio: string;
  observacion: string;
}

export interface NotificacionRevisor {
  id: string;
  titulo: string;
  detalle: string;
  fecha: string;
  tipo: 'plazo' | 'asignacion' | 'mensaje';
}

export interface GuiaRevision {
  id: string;
  titulo: string;
  descripcion: string;
  recurso: string;
}

export const ARTICULOS_ASIGNADOS_MOCK: ArticuloRevisor[] = [
  {
    id: 101,
    codigo: 'REV-2026-011',
    titulo: 'Aprendizaje basado en proyectos para aulas rurales',
    resumen:
      'Estudio mixto sobre estrategias de aprendizaje basado en proyectos en instituciones rurales con resultados de mejora en autonomia estudiantil.',
    tema: 'Innovacion Pedagogica',
    fechaAsignacion: '2026-03-20',
    fechaLimite: '2026-04-20',
    estado: 'en-proceso',
    prioridad: 'alta',
    ronda: 1,
  },
  {
    id: 102,
    codigo: 'REV-2026-014',
    titulo: 'Practicas de lectura critica en primer semestre universitario',
    resumen:
      'Analisis comparativo de talleres de lectura critica y su impacto en comprension inferencial en programas de ingreso.',
    tema: 'Didactica Universitaria',
    fechaAsignacion: '2026-03-28',
    fechaLimite: '2026-04-28',
    estado: 'pendiente',
    prioridad: 'media',
    ronda: 2,
  },
  {
    id: 103,
    codigo: 'REV-2026-018',
    titulo: 'Uso de analiticas para seguimiento de permanencia estudiantil',
    resumen:
      'Propuesta de panel institucional con indicadores tempranos de desercion y rutas de intervencion por facultad.',
    tema: 'Analitica Educativa',
    fechaAsignacion: '2026-03-30',
    fechaLimite: '2026-04-30',
    estado: 'pendiente',
    prioridad: 'baja',
    ronda: 1,
  },
];

export const HISTORIAL_REVISIONES_MOCK: RegistroHistorialRevision[] = [
  {
    id: 'H-001',
    codigoArticulo: 'REV-2026-004',
    tituloArticulo: 'Narrativas docentes y evaluacion formativa en secundaria',
    decision: 'aceptar',
    fechaEnvio: '2026-03-07',
    observacion: 'Cumple criterios metodologicos y presenta aportes claros al campo.',
  },
  {
    id: 'H-002',
    codigoArticulo: 'REV-2026-005',
    tituloArticulo: 'Diseno universal para el aprendizaje en entornos hibridos',
    decision: 'ajustes',
    fechaEnvio: '2026-03-12',
    observacion: 'Solicita mayor evidencia en resultados y precision en el marco teorico.',
  },
  {
    id: 'H-003',
    codigoArticulo: 'REV-2026-009',
    tituloArticulo: 'Laboratorios virtuales para ciencias naturales en bachillerato',
    decision: 'rechazar',
    fechaEnvio: '2026-03-18',
    observacion: 'La muestra no permite sostener las conclusiones y faltan criterios eticos.',
  },
];

export const NOTIFICACIONES_REVISOR_MOCK: NotificacionRevisor[] = [
  {
    id: 'N-101',
    titulo: 'Nuevo articulo asignado',
    detalle: 'Se asigno REV-2026-018 para evaluacion de primera ronda.',
    fecha: '2026-04-04T08:20:00',
    tipo: 'asignacion',
  },
  {
    id: 'N-102',
    titulo: 'Plazo cercano',
    detalle: 'REV-2026-011 vence en 14 dias. Programa tu revision final.',
    fecha: '2026-04-05T09:40:00',
    tipo: 'plazo',
  },
  {
    id: 'N-103',
    titulo: 'Mensaje del editor',
    detalle: 'Recuerda usar la rubrica vigente para articulos de innovacion pedagogica.',
    fecha: '2026-04-05T17:10:00',
    tipo: 'mensaje',
  },
];

export const GUIAS_REVISION_MOCK: GuiaRevision[] = [
  {
    id: 'G-01',
    titulo: 'Checklist de revision metodologica',
    descripcion: 'Criterios minimos para evaluar coherencia entre objetivo, metodo y resultados.',
    recurso: 'PDF interno',
  },
  {
    id: 'G-02',
    titulo: 'Guia de redaccion de dictamen',
    descripcion: 'Plantilla de observaciones accionables para autores y editor.',
    recurso: 'Plantilla DOCX',
  },
  {
    id: 'G-03',
    titulo: 'Politica de etica y conflicto de interes',
    descripcion: 'Lineamientos para declarar conflictos y preservar la imparcialidad.',
    recurso: 'Politica editorial',
  },
];
