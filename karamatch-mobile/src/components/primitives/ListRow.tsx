import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `ListRow` — a row inside a Group:
// leading icon, title/subtitle, trailing value + chevron.
export function ListRow({
    icon,
    iconColor,
    leading,
    title,
    subtitle,
    value,
    onPress,
    chevron,
    danger,
    trailing,
    last
}: {
    icon?: IconName;
    iconColor?: string;
    leading?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    value?: ReactNode;
    onPress?: () => void;
    chevron?: boolean;
    danger?: boolean;
    trailing?: ReactNode;
    last?: boolean;
}) {
    const { C, S, S2, T } = useTheme();

    const body = (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: S2.s12,
                minHeight: 52,
                paddingVertical: 10,
                paddingHorizontal: S.md,
                borderBottomWidth: last ? 0 : 1,
                borderBottomColor: C.border
            }}
        >
            {leading}
            {icon ? <Icon name={icon} size={20} color={danger ? C.tintSoft : iconColor ?? C.textMuted} /> : null}
            <View style={{ flex: 1, minWidth: 0 }}>
                {typeof title === "string" ? (
                    <Text style={[T.bodyStrong, { color: danger ? C.tintSoft : C.text }]} numberOfLines={1}>
                        {title}
                    </Text>
                ) : (
                    title
                )}
                {subtitle ? (
                    typeof subtitle === "string" ? (
                        <Text style={[T.caption, { color: C.textMuted, marginTop: 1 }]}>{subtitle}</Text>
                    ) : (
                        subtitle
                    )
                ) : null}
            </View>
            {value ? (
                typeof value === "string" ? <Text style={[T.caption, { color: C.textMuted }]}>{value}</Text> : value
            ) : null}
            {trailing}
            {chevron ? <Icon name="chevronRight" size={18} color={C.textFaint} /> : null}
        </View>
    );

    if (!onPress) {
        return body;
    }
    return (
        <AppPressable onPress={onPress} scaleTo={1} opacityTo={0.6}>
            {body}
        </AppPressable>
    );
}
