import Mapbox from '@rnmapbox/maps';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import type {DirectionProps} from './MapViewTypes';
import utils from './utils';

function Direction({coordinates, belowLayerID}: DirectionProps) {
    const styles = useThemeStyles();

    if (!utils.isSingleRoute(coordinates)) {
        const validRoutes = coordinates.filter((route) => route.length >= 2);
        if (validRoutes.length === 0) {
            return null;
        }

        return (
            <>
                {validRoutes.map((routeCoordinates, index) => (
                    <Mapbox.ShapeSource
                        // Using index as key is safe because we are not reordering the routes
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${CONST.MAP_VIEW_LAYERS.ROUTE_SOURCE}-${index}`}
                        id={`${CONST.MAP_VIEW_LAYERS.ROUTE_SOURCE}-${index}`}
                        shape={{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: routeCoordinates,
                            },
                        }}
                    >
                        <Mapbox.LineLayer
                            belowLayerID={belowLayerID}
                            id={`${CONST.MAP_VIEW_LAYERS.ROUTE_FILL}-${index}`}
                            style={styles.mapDirection}
                        />
                    </Mapbox.ShapeSource>
                ))}
            </>
        );
    }

    if (coordinates.length < 2) {
        return null;
    }

    return (
        <Mapbox.ShapeSource
            id={CONST.MAP_VIEW_LAYERS.ROUTE_SOURCE}
            shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates,
                },
            }}
        >
            <Mapbox.LineLayer
                belowLayerID={belowLayerID}
                id={CONST.MAP_VIEW_LAYERS.ROUTE_FILL}
                style={styles.mapDirection}
            />
        </Mapbox.ShapeSource>
    );
}

export default Direction;
