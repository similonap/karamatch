import { useState } from "react";
import { Text, View } from "react-native";

import { AppBar } from "./components/scaffolding/AppBar";
import { BottomBar } from "./components/scaffolding/BottomBar";
import { Screen } from "./components/scaffolding/Screen";
import { Button } from "./components/primitives/Button";
import { Group } from "./components/primitives/Group";
import { ListRow } from "./components/primitives/ListRow";
import { VenueCard } from "./components/domain/VenueCard";
import { VenueLocationCard } from "./components/domain/VenueLocationCard";
import { MOCK_VENUE } from "./mocks/data";
import { money, plural } from "./utils/format";
import { useTheme } from "./theme/ThemeProvider";

// Not part of the shelf itself — a minimal two-screen app assembled purely
// from src/components, just enough to prove the shelf actually produces a
// real screen (as opposed to only ever being seen one component at a time
// in Storybook). Shown when EXPO_PUBLIC_STORYBOOK=false; see App.tsx.
export function PlaceholderApp() {
    const { C } = useTheme();
    const [openVenue, setOpenVenue] = useState(false);

    return (
        <View style={{ flex: 1, backgroundColor: C.surface }}>
            {openVenue ? <VenueDetailScreen onBack={() => setOpenVenue(false)} /> : <VenueListScreen onOpen={() => setOpenVenue(true)} />}
        </View>
    );
}

function VenueListScreen({ onOpen }: { onOpen: () => void }) {
    return (
        <>
            <AppBar title="Karaoke near you" large />
            <Screen>
                <VenueCard venue={MOCK_VENUE} onPress={onOpen} />
            </Screen>
        </>
    );
}

function VenueDetailScreen({ onBack }: { onBack: () => void }) {
    const { C, S, T } = useTheme();
    const room = MOCK_VENUE.rooms[0];

    return (
        <>
            <AppBar title={MOCK_VENUE.name} onBack={onBack} />
            <Screen gap={S.md}>
                <VenueLocationCard name={MOCK_VENUE.name} lat={MOCK_VENUE.lat} lng={MOCK_VENUE.lng} />
                <Group title={plural(MOCK_VENUE.rooms.length, "room", "rooms")}>
                    <ListRow
                        title={room.name}
                        subtitle={plural(room.seats, "seat", "seats") + " · " + money(room.pricePerHour) + "/hr"}
                        last
                    />
                </Group>
                <Text style={[T.caption, { color: C.textMuted }]}>
                    This screen exists to prove the shelf assembles — swap it for your own once you're building the real app.
                </Text>
            </Screen>
            <BottomBar>
                <Button label={"Book from " + money(MOCK_VENUE.fromPrice) + "/hr"} onPress={() => {}} />
            </BottomBar>
        </>
    );
}
