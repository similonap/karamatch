import { useEffect, useState } from "react";

// Ported verbatim from karamatch-web/src/ui.tsx — setTimeout/Promise based,
// nothing DOM-specific to adapt.

// Runs an async loader on mount / when `deps` change, tracking loading + error.
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let live = true;
        setLoading(true);
        setError(null);
        loader()
            .then(result => {
                if (live) {
                    setData(result);
                }
            })
            .catch((err: Error) => {
                if (live) {
                    setError(err.message);
                }
            })
            .finally(() => {
                if (live) {
                    setLoading(false);
                }
            });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce]);

    return { data, loading, error, reload: () => setNonce(n => n + 1), setData };
}

// Debounced value, for the song / people search inputs.
export function useDebounced<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
