import {Circle} from 'react-native-svg';
import SkeletonRect from '@components/SkeletonRect';
import TableSkeleton from '@components/Table/TableSkeleton';
import useSkeletonSpan from '@libs/telemetry/useSkeletonSpan';

type WorkspaceCompanyCardsTableSkeletonProps = {};

export default function WorkspaceCompanyCardsTableSkeleton({}: WorkspaceCompanyCardsTableSkeletonProps) {
    useSkeletonSpan('TableRowSkeleton', reasonAttributes);

    const circleX = 36;
    const circleY = 36;
    const rectX = 68;
    const rectY1 = 24;
    const rectY2 = 40;

    return (
        <TableSkeleton
            rowCount={5}
            renderSkeletonItem={() => {
                <>
                    <Circle
                        cx={36}
                        cy={36}
                        r="20"
                    />
                    <SkeletonRect
                        transform={[{translateX: rectX}, {translateY: rectY1}]}
                        width={124}
                        height={8}
                    />
                    <SkeletonRect
                        transform={[{translateX: rectX}, {translateY: rectY2}]}
                        width={60}
                        height={8}
                    />
                </>;
            }}
        />
    );
}
