import { useState, useEffect, useCallback, useRef } from 'react';

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

    // ⏰ Kényszerített hálózati lakat (Timeout) időzítő
    const timeoutId = setTimeout(() => {
      controllerRef.current?.abort();
    }, timeoutMs);

    try {
      const res = await fetch(url, { signal });
      clearTimeout(timeoutId);

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

  // 🎯 JAVÍTVA: React.useRef helyett a tiszta useRef-et hívjuk meg!
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

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

  const refetch = () => {
    if (enabled) {
      const controller = new AbortController();
      controllerRef.current = controller;
      executeFetch(controller.signal);
    }
  };

  return { data, loading, error, refetch };
}
