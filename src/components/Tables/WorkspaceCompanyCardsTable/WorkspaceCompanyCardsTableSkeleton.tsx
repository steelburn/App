import React from 'react';
import {Circle} from 'react-native-svg';
import SkeletonRect from '@components/SkeletonRect';
import TableSkeleton from '@components/Table/TableSkeleton';
import {SkeletonSpanReasonAttributes} from '@libs/telemetry/useSkeletonSpan';

type WorkspaceCompanyCardsTableSkeletonProps = {
    reasonAttributes: SkeletonSpanReasonAttributes;
};

export default function WorkspaceCompanyCardsTableSkeleton({reasonAttributes}: WorkspaceCompanyCardsTableSkeletonProps) {
    return (
        <TableSkeleton
            rowCount={5}
            reasonAttributes={reasonAttributes}
            renderSkeletonItem={() => (
                <>
                    <Circle
                        cx={28}
                        cy={28}
                        r="14"
                    />
                    <SkeletonRect
                        transform={[{translateX: 58}, {translateY: 16}]}
                        width={124}
                        height={8}
                    />
                    <SkeletonRect
                        transform={[{translateX: 58}, {translateY: 32}]}
                        width={60}
                        height={8}
                    />
                </>
            )}
        />
    );
}
