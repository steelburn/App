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
            renderSkeletonItem={() => {
                <>
                    <Circle
                        cx={36}
                        cy={36}
                        r="20"
                    />
                    <SkeletonRect
                        transform={[{translateX: 68}, {translateY: 20}]}
                        width={124}
                        height={8}
                    />
                    <SkeletonRect
                        transform={[{translateX: 68}, {translateY: 362}]}
                        width={60}
                        height={8}
                    />
                </>;
            }}
        />
    );
}
