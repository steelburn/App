import {useLayoutEffect} from 'react';

function useFilterCountChange(itemCount: number, callback?: (itemCount: number) => void) {
    useLayoutEffect(() => {
        callback?.(itemCount);
    }, [itemCount, callback]);
}

export default useFilterCountChange;
