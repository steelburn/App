import {act, renderHook} from '@testing-library/react-native';
import type {OnyxEntry} from 'react-native-onyx';
import useTransactionThreadPendingSkeleton from '@hooks/useTransactionThreadPendingSkeleton';
import CONST from '@src/CONST';
import type {Report} from '@src/types/onyx';

describe('useTransactionThreadPendingSkeleton', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns false when not a single expense', () => {
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(false, 'thread123', undefined as OnyxEntry<Report>, false));
        expect(result.current).toBe(false);
    });

    it('returns false when transactionThreadReportID is undefined', () => {
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(true, undefined, undefined as OnyxEntry<Report>, false));
        expect(result.current).toBe(false);
    });

    it('returns false when transactionThreadReportID is FAKE_REPORT_ID', () => {
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(true, CONST.FAKE_REPORT_ID, undefined as OnyxEntry<Report>, false));
        expect(result.current).toBe(false);
    });

    it('returns false when offline', () => {
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(true, 'thread123', undefined as OnyxEntry<Report>, true));
        expect(result.current).toBe(false);
    });

    it('returns false when transactionThreadReport already has a reportID', () => {
        const report = {reportID: 'thread123'} as Report;
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(true, 'thread123', report, false));
        expect(result.current).toBe(false);
    });

    it('returns true when all pending conditions are met', () => {
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(true, 'thread123', undefined as OnyxEntry<Report>, false));
        expect(result.current).toBe(true);
    });

    it('returns false when transactionThreadReport resolves during pending state', () => {
        const {result, rerender} = renderHook(({report}) => useTransactionThreadPendingSkeleton(true, 'thread123', report, false), {
            initialProps: {report: undefined as OnyxEntry<Report>},
        });
        expect(result.current).toBe(true);

        rerender({report: {reportID: 'thread123'} as Report});
        expect(result.current).toBe(false);
    });

    it('returns false after SKELETON_LOADING_TIMEOUT_MS expires', () => {
        const {result} = renderHook(() => useTransactionThreadPendingSkeleton(true, 'thread123', undefined as OnyxEntry<Report>, false));
        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(CONST.SKELETON_LOADING_TIMEOUT_MS);
        });

        expect(result.current).toBe(false);
    });

    it('returns false when isPending becomes false even if timedOutID is stale', () => {
        const {result, rerender} = renderHook(({isSingle, reportID, report, offline}) => useTransactionThreadPendingSkeleton(isSingle, reportID, report, offline), {
            initialProps: {isSingle: true, reportID: 'thread123', report: undefined as OnyxEntry<Report>, offline: false},
        });

        expect(result.current).toBe(true);

        rerender({isSingle: false, reportID: 'thread123', report: undefined as OnyxEntry<Report>, offline: false});
        expect(result.current).toBe(false);
    });

    it('shows skeleton again for a new transactionThreadReportID after a previous one timed out', () => {
        const {result, rerender} = renderHook(({reportID}) => useTransactionThreadPendingSkeleton(true, reportID, undefined as OnyxEntry<Report>, false), {
            initialProps: {reportID: 'thread1'},
        });

        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(CONST.SKELETON_LOADING_TIMEOUT_MS);
        });
        expect(result.current).toBe(false);

        rerender({reportID: 'thread2'});
        expect(result.current).toBe(true);
    });

    it('restarts timeout for a new transactionThreadReportID', () => {
        const {result, rerender} = renderHook(({reportID}) => useTransactionThreadPendingSkeleton(true, reportID, undefined as OnyxEntry<Report>, false), {
            initialProps: {reportID: 'thread1'},
        });

        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(CONST.SKELETON_LOADING_TIMEOUT_MS / 2);
        });
        expect(result.current).toBe(true);

        rerender({reportID: 'thread2'});
        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(CONST.SKELETON_LOADING_TIMEOUT_MS / 2);
        });
        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(CONST.SKELETON_LOADING_TIMEOUT_MS / 2);
        });
        expect(result.current).toBe(false);
    });

    it('stops showing skeleton when going offline', () => {
        const {result, rerender} = renderHook(({offline}) => useTransactionThreadPendingSkeleton(true, 'thread123', undefined as OnyxEntry<Report>, offline), {
            initialProps: {offline: false},
        });

        expect(result.current).toBe(true);

        rerender({offline: true});
        expect(result.current).toBe(false);
    });

    it('does not restart the timeout when toggling offline and back online', () => {
        const {result, rerender} = renderHook(({offline}) => useTransactionThreadPendingSkeleton(true, 'thread123', undefined as OnyxEntry<Report>, offline), {
            initialProps: {offline: false},
        });

        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(CONST.SKELETON_LOADING_TIMEOUT_MS - 1000);
        });
        expect(result.current).toBe(true);

        rerender({offline: true});
        expect(result.current).toBe(false);

        rerender({offline: false});
        expect(result.current).toBe(true);

        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(result.current).toBe(false);
    });
});
