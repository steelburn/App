import {useCallback, useRef} from 'react';

/**
 * Returns a factory that, given an index, returns a referentially-stable
 * handler bound to that index. Same index → same handler across renders.
 *
 * Useful in virtualized lists where rows need per-index callbacks but allocating
 * a fresh closure per row per render causes downstream re-renders.
 *
 * The cache grows monotonically with unique indices visited and is released
 * with the consuming component, so this is safe for list-bounded index spaces.
 *
 * Caller must pass a stable `handler` reference (e.g. a `useState` setter or a
 * `useCallback`-memoized function). If `handler` flips between renders, the
 * factory does too — and any `useCallback`/`useMemo` that lists the factory
 * in deps will be invalidated each render.
 */
function useStableIndexedHandler<Args extends unknown[]>(handler: (index: number, ...args: Args) => void): (index: number) => (...args: Args) => void {
    const cacheRef = useRef<Map<number, (...args: Args) => void>>(new Map());

    return useCallback(
        (index: number) => {
            const cache = cacheRef.current;
            const cached = cache.get(index);
            if (cached) {
                return cached;
            }
            const bound = (...args: Args) => handler(index, ...args);
            cache.set(index, bound);
            return bound;
        },
        [handler],
    );
}

export default useStableIndexedHandler;
