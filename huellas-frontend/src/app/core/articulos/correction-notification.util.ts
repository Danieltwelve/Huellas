export type CorrectionState = 'solicitada' | 'enviada' | 'aceptada' | null;

export interface CorrectionNotificationSource {
  estadoCorreccion?: CorrectionState;
  titulo?: string;
  detalle?: string;
}

export function inferCorrectionState(
  notification: CorrectionNotificationSource,
): CorrectionState {
  return notification.estadoCorreccion ?? null;
}

export function normalizeText(texto: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}