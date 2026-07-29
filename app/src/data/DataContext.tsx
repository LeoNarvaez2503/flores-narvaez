/**
 * Provee el catálogo a la app. Al montar, intenta traerlo del backend
 * (GET /wines); si falla, usa el catálogo local como fallback para que la
 * app nunca quede vacía. Expone `data`, `loading`, `error` y `reload`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dataset } from '../types';
import { localDataset } from './catalog';
import { fetchDataset } from './remote';

interface DataState {
  data: Dataset;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const DataContext = createContext<DataState | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Dataset>(localDataset);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchDataset()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch(() => {
        setData(localDataset);
        setError('Sin conexión al backend — mostrando catálogo local.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<DataState>(() => ({ data, loading, error, reload: load }), [data, loading, error, load]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}
