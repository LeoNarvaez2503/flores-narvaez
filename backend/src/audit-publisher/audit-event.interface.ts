export interface AuditEvent {
  /** Nombre de la entidad: vinos, tiendas, usuarios, reservas, pagos */
  entity: string;
  /** Acción realizada: CREATE, UPDATE, DELETE */
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  /** ID del usuario que ejecutó la acción */
  userId: string;
  /** Email del usuario que ejecutó la acción */
  userEmail: string;
  /** Fecha y hora ISO del evento */
  timestamp: string;
  /** Datos del evento con estado previo y posterior */
  data: {
    before: Record<string, any> | null;
    after: Record<string, any> | null;
  };
}
