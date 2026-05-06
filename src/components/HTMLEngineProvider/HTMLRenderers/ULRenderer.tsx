import React from 'react';
import {View} from 'react-native';
import type {CustomRendererProps, TBlock} from 'react-native-render-html';
import {TNodeChildrenRenderer} from 'react-native-render-html';

/**
 * Bypasses the library's internal ULRenderer (which wraps children in MarkedListItem)
 * and renders ul as a plain block container — matching how bullet-list works.
 * The actual bullet markers are drawn by the li renderer (BulletItemRenderer).
 */
function ULRenderer({tnode, style}: CustomRendererProps<TBlock>) {
    return (
        <View style={[style, {gap: 8}]}>
            <TNodeChildrenRenderer tnode={tnode} />
        </View>
    );
}

export default ULRenderer;
