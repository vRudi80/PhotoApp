import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../utils/constants';

interface UseFetchOptions {
  enabled?: boolean;
  timeoutMs?: number;
}

export function useFetch<T>(url: string, options: UseFetchOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.enabled !== false);
  const [error, setError] = useState<string | null>(null);

  const { enabled = true, timeoutMs = 6000 } = options;

  const executeFetch = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    // Kényszerített hálózati lakat (Timeout) időzítő
    const timeoutId = setTimeout(() => {
      // Ha lejár az idő, manuálisan megszakítjuk a kérést
      controllerRef.current?.abort();
    }, timeoutMs);

    try {
      const res = await fetch(url, { signal });
      clearTimeout(timeoutId);

      // Ha nem 200 OK a válasz, elkapjuk a HTML hibaoldalakat is
      if (!res.ok) {
        throw new Error(`Szerver hiba: ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        console.error(`❌ Hálózati hiba a végponton [${url}]:`, err.message);
        setError(err.message || 'Ismeretlen hiba történt.');
      }
    } finally {
      setLoading(false);
    }
  }, [url, timeoutMs]);

  const controllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    // Ha a feltételek nem adottak (pl. nincs még email), leállítjuk a pörgést, nem hagyjuk lógni
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Ha fut egy régi kérés, azt azonnal elvágjuk (Race condition védelem)
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    executeFetch(controller.signal);

    return () => {
      controller.abort();
    };
  }, [enabled, executeFetch]);

  // Manuális frissítési lehetőség (Refetch)
  const refetch = () => {
    if (enabled) {
      const controller = new AbortController();
      controllerRef.current = controller;
      executeFetch(controller.signal);
    }
  };

  return { data, loading, error, refetch };
}
