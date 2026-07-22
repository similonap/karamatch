import { TextInput, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../../icons/Icon";
import { AppPressable } from "./AppPressable";

// Ported from karamatch-web/src/ui.tsx's `SearchField` — a search field with
// a leading glyph and a clear button once it has content.
export function SearchField({
    value,
    onChange,
    placeholder
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    const { C, R, T } = useTheme();

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                height: 44,
                paddingLeft: 12,
                paddingRight: 10,
                borderRadius: R.md,
                borderCurve: "continuous",
                backgroundColor: C.surface2,
                borderWidth: 1,
                borderColor: C.border
            }}
        >
            <Icon name="search" size={17} color={C.textFaint} />
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={C.textFaint}
                style={[T.body, { flex: 1, color: C.text, padding: 0 }]}
            />
            {value ? (
                <AppPressable
                    onPress={() => onChange("")}
                    accessibilityLabel="Clear search"
                    style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: R.full }}
                >
                    <Icon name="close" size={15} strokeWidth={2.2} color={C.textFaint} />
                </AppPressable>
            ) : null}
        </View>
    );
}
