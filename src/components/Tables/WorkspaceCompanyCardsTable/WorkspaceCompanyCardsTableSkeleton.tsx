import React from 'react';
import {Circle} from 'react-native-svg';
import SkeletonRect from '@components/SkeletonRect';

export default function WorkspaceCompanyCardsTableSkeleton() {
    return (
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
    );
}
