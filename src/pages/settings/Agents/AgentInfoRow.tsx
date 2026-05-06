import React from 'react';
import {View} from 'react-native';
import ReportActionAvatars from '@components/ReportActionAvatars';
import Text from '@components/Text';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';

type AgentInfoRowProps = {
    accountID: number;
    displayName: string;
    login: string;
};

function AgentInfoRow({accountID, displayName, login}: AgentInfoRowProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();

    return (
        <>
            <ReportActionAvatars
                accountIDs={[accountID]}
                size={CONST.AVATAR_SIZE.LARGE_NORMAL}
                shouldShowTooltip={false}
                singleAvatarContainerStyle={[StyleUtils.getWidthAndHeightStyle(variables.avatarSizeLargeNormal)]}
            />
            <View style={[styles.flex1, styles.gap1]}>
                <Text
                    numberOfLines={1}
                    style={styles.textStrong}
                >
                    {displayName}
                </Text>
                <Text
                    numberOfLines={1}
                    style={styles.mutedNormalTextLabel}
                >
                    {login}
                </Text>
            </View>
        </>
    );
}

export default AgentInfoRow;
