import {act, renderHook} from '@testing-library/react-native';
import useInlineEditState from '@components/Table/EditableCell/useInlineEditState';

describe('useInlineEditState', () => {
    it('starts with isEditing=false and localValue equal to the initial value', () => {
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello'));

        expect(result.current.isEditing).toBe(false);
        expect(result.current.localValue).toBe('hello');
    });

    it('startEditing sets isEditing to true', () => {
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello'));

        act(() => {
            result.current.startEditing();
        });

        expect(result.current.isEditing).toBe(true);
    });

    it('save calls onSave with the new value when localValue differs from original', () => {
        const onSave = jest.fn();
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello', onSave));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.setLocalValue('world');
        });
        act(() => {
            result.current.save();
        });

        expect(onSave).toHaveBeenCalledWith('world');
        expect(result.current.isEditing).toBe(false);
    });

    it('save works without an onSave callback (no crash)', () => {
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello'));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.setLocalValue('changed');
        });

        expect(() => {
            act(() => {
                result.current.save();
            });
        }).not.toThrow();
        expect(result.current.isEditing).toBe(false);
    });

    it('cancel resets localValue to the original and sets isEditing to false', () => {
        const onSave = jest.fn();
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello', onSave));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.setLocalValue('modified');
        });
        expect(result.current.localValue).toBe('modified');

        act(() => {
            result.current.cancelEditing();
        });

        expect(result.current.localValue).toBe('hello');
        expect(result.current.isEditing).toBe(false);
        expect(onSave).not.toHaveBeenCalled();
    });

    it('cancel without prior edits still sets isEditing to false', () => {
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello'));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.cancelEditing();
        });

        expect(result.current.isEditing).toBe(false);
        expect(result.current.localValue).toBe('hello');
    });

    it('syncs localValue when the external value prop changes', () => {
        let externalValue = 'initial';
        const {result, rerender} = renderHook(() => useInlineEditState<string>(true, externalValue));

        expect(result.current.localValue).toBe('initial');

        externalValue = 'updated';
        rerender({});

        expect(result.current.localValue).toBe('updated');
    });

    it('works with numeric values', () => {
        const onSave = jest.fn();
        const {result} = renderHook(() => useInlineEditState<number>(true, 42, onSave));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.setLocalValue(99);
        });
        act(() => {
            result.current.save();
        });

        expect(onSave).toHaveBeenCalledWith(99);
        expect(result.current.isEditing).toBe(false);
    });

    it('cancels editing when canEdit becomes false while editing', () => {
        let canEdit = true;
        const onSave = jest.fn();
        const {result, rerender} = renderHook(() => useInlineEditState<string>(canEdit, 'hello', onSave));

        act(() => {
            result.current.startEditing();
        });

        expect(result.current.isEditing).toBe(true);

        act(() => {
            result.current.setLocalValue('modified');
        });

        // Revoke permission while editing
        canEdit = false;
        rerender({});

        // Should auto-cancel due to useEffect
        expect(result.current.isEditing).toBe(false);
        expect(result.current.localValue).toBe('hello'); // Reverted to original
        expect(onSave).not.toHaveBeenCalled();
    });

    it('prevents duplicate onSave calls when save is called multiple times', () => {
        const onSave = jest.fn();
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello', onSave));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.setLocalValue('world');
        });

        // Call save twice
        act(() => {
            result.current.save();
            result.current.save(); // Second call should be ignored
        });

        // onSave should only be called once
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith('world');
    });

    it('prevents duplicate cancel when cancelEditing is called multiple times', () => {
        const onSave = jest.fn();
        const {result} = renderHook(() => useInlineEditState<string>(true, 'hello', onSave));

        act(() => {
            result.current.startEditing();
        });
        act(() => {
            result.current.setLocalValue('modified');
        });

        // Call cancelEditing twice
        act(() => {
            result.current.cancelEditing();
            result.current.cancelEditing(); // Second call should be ignored
        });

        expect(result.current.isEditing).toBe(false);
        expect(result.current.localValue).toBe('hello');
        expect(onSave).not.toHaveBeenCalled();

        // Verify we can start editing again after cancel
        act(() => {
            result.current.startEditing();
        });
        expect(result.current.isEditing).toBe(true);
    });
});
