/**
 * Antes simulaba la barra de estado de iOS para el marco de teléfono.
 * Tras migrar a web responsive ya no aplica: queda como no-op para no tener que
 * tocar cada pantalla que la referencia.
 */
import React from 'react';

export function StatusBarMock(): React.ReactElement | null {
  return null;
}
