import { View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/screens/Profile.tsx's inline avatar-with-
// camera-badge — the badge is what makes it read as editable, rather than
// the old dashed "Add photo" ring. Wiring an actual image picker is left to
// the consumer (out of scope for a shelf that has to run in plain Expo Go);
// this only renders the affordance and fires `onPress`.
export function AvatarPicker({
    photoUrl,
    onPress,
    size = 96
}: {
    photoUrl?: string | null;
    onPress: () => void;
    size?: number;
}) {
    const { C } = useTheme();
    const badgeSize = Math.round(size * 0.31);

    return (
        <AppPressable onPress={onPress} accessibilityLabel="Change profile photo" scaleTo={0.97} style={{ width: size, height: size }}>
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    overflow: "hidden",
                    backgroundColor: C.surface2,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                    <Icon name="camera" size={Math.round(size * 0.29)} color={C.textFaint} />
                )}
            </View>
            <View
                style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: C.tint,
                    borderWidth: 2.5,
                    borderColor: C.surface,
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <Icon name="camera" size={Math.round(badgeSize * 0.46)} color={C.onTint} />
            </View>
        </AppPressable>
    );
}
