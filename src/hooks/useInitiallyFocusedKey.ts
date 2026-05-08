import {useEffect, useState} from 'react';

/**
 * Returns an initially focused key that is cleared after the first animation frame.
 * This prevents FlashList from auto-scrolling when data changes cause the key
 * to transition from "not found" to "found" (e.g., clearing a search).
 * Deferred by one frame so FlashList processes the initial scroll first.
 */
function useInitiallyFocusedKey(computeKey: () => string | undefined): string | undefined {
    const [initiallyFocusedKey, setInitiallyFocusedKey] = useState(computeKey);

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            setInitiallyFocusedKey(undefined);
        });
        return () => cancelAnimationFrame(id);
    }, []);

    return initiallyFocusedKey;
}

export default useInitiallyFocusedKey;
