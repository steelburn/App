import {useRef} from 'react';

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
 * Caller must pass a stable `handler` reference (e.g. a `useState` setter or
 * compiler-memoized function). If `handler` flips reference every render, the
 * factory itself does too — cached handlers still call through to the latest
 * `handler`, but consumers that put the factory in deps will lose stability.
 */
function useStableIndexedHandler<Args extends unknown[]>(handler: (index: number, ...args: Args) => void): (index: number) => (...args: Args) => void {
    const cacheRef = useRef<Map<number, (...args: Args) => void>>(new Map());

    return (index: number) => {
        const cache = cacheRef.current;
        const cached = cache.get(index);
        if (cached) {
            return cached;
        }
        const bound = (...args: Args) => handler(index, ...args);
        cache.set(index, bound);
        return bound;
    };
}

export default useStableIndexedHandler;
