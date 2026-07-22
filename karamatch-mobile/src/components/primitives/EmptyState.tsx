import { Text, View } from "react-native";
import type { ReactNode } from "react";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/types";

// Ported from karamatch-web/src/ui.tsx's `EmptyState` — an icon, a line, and
// ideally a way out.
export function EmptyState({
    icon = "info",
    title,
    body,
    action
}: {
    icon?: IconName;
    title: string;
    body?: string;
    action?: ReactNode;
}) {
    const { C, R, S, T } = useTheme();
    return (
        <View style={{ alignItems: "center", justifyContent: "center", gap: S.sm, paddingVertical: S.xl, paddingHorizontal: S.lg }}>
            <View
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: R.lg,
                    borderCurve: "continuous",
                    backgroundColor: C.surface2,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: S.xs
                }}
            >
                <Icon name={icon} size={24} color={C.textFaint} />
            </View>
            <Text style={[T.bodyStrong, { color: C.text, textAlign: "center" }]}>{title}</Text>
            {body ? <Text style={[T.caption, { color: C.textMuted, textAlign: "center", maxWidth: 250 }]}>{body}</Text> : null}
            {action ? <View style={{ marginTop: S.sm }}>{action}</View> : null}
        </View>
    );
}
