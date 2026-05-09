import {useEffect, useRef, useState} from 'react';

/**
 * Returns an initially focused key that is cleared after the first effect cycle.
 * This prevents FlashList from auto-scrolling when data changes cause the key
 * to transition from "not found" to "found" (e.g., clearing a search).
 * Uses a ref to skip the first effect run so FlashList processes the initial scroll,
 * then clears the key on the second effect run.
 */
function useInitiallyFocusedKey(computeKey: () => string | undefined): string | undefined {
    const [initiallyFocusedKey, setInitiallyFocusedKey] = useState(computeKey);
    const hasRenderedOnce = useRef(false);

    useEffect(() => {
        if (!hasRenderedOnce.current) {
            hasRenderedOnce.current = true;
            return;
        }
        if (initiallyFocusedKey !== undefined) {
            setInitiallyFocusedKey(undefined);
        }
    }, [initiallyFocusedKey]);

    return initiallyFocusedKey;
}

export default useInitiallyFocusedKey;
