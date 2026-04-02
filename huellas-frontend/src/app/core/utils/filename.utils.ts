/**
 * Normaliza un nombre de archivo removiendo tildes y caracteres acentuados
 * Ejemplo: "RÚBRICA.pdf" -> "RUBRICA.pdf"
 */
export function normalizarNombreArchivo(nombre: string): string {
  if (!nombre) return nombre;

  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[ñÑ]/g, (char) => (char === 'ñ' ? 'n' : 'N')); // Handle ñ/Ñ separately
}
