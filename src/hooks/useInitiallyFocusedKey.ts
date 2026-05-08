import {useEffect, useRef, useState} from 'react';

/**
 * Returns an initially focused key that is cleared after the first render where
 * `isReady` is true. This prevents FlashList from auto-scrolling when data
 * changes cause the key to transition from "not found" to "found" (e.g.,
 * clearing a search).
 *
 * The key is cleared via useEffect (post-paint) so the list processes
 * the initial scroll during the render before the effect fires.
 *
 * @param computeKey - Computes the key on first render (passed to useState).
 * @param isReady - When false the clear is deferred until it becomes true.
 *                  Use this when the list is behind a loading state.
 */
function useInitiallyFocusedKey(computeKey: () => string | undefined, isReady = true): string | undefined {
    const [initiallyFocusedKey, setInitiallyFocusedKey] = useState(computeKey);
    const hasClearedRef = useRef(false);

    useEffect(() => {
        if (hasClearedRef.current || !isReady) {
            return;
        }
        hasClearedRef.current = true;
        setInitiallyFocusedKey(undefined);
    }, [isReady]);

    return initiallyFocusedKey;
}

export default useInitiallyFocusedKey;
