/** Parámetros de una reserva. */
export type ReserveParams = { wineId: string; storeId: string; price: number };

/** Rutas y parámetros del stack de navegación. */
export type RootStackParamList = {
  Landing: undefined;
  Search: undefined;
  WineDetail: { wineId: string };
  Reserve: ReserveParams;
  // Login/Register pueden recibir a dónde continuar tras autenticarse (ej. completar una reserva).
  Login: { next?: ReserveParams } | undefined;
  Register: { next?: ReserveParams } | undefined;
};
