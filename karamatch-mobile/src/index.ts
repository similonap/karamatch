// The shelf. Import components, theme, icons, and utilities from here in a
// student's own app — this folder is copy-paste portable (see README.md).

// Theme
export { ThemeProvider, useTheme } from "./theme/ThemeProvider";
export type { ThemeMode, ThemeValue } from "./theme/ThemeProvider";
export type { ColorScheme, Palette, Shadows } from "./theme/colors";
export { FONT, LAYOUT, R, S, S2, T } from "./theme/tokens";

// Icons
export { Icon } from "./icons/Icon";
export { StarIcon } from "./icons/StarIcon";
export type { IconName } from "./icons/types";

// Primitives
export { AppPressable } from "./components/primitives/AppPressable";
export { Avatar } from "./components/primitives/Avatar";
export { AvatarStack } from "./components/primitives/AvatarStack";
export { BrandMark } from "./components/primitives/BrandMark";
export { Button } from "./components/primitives/Button";
export { Card } from "./components/primitives/Card";
export { CheckRing } from "./components/primitives/CheckRing";
export { Chip } from "./components/primitives/Chip";
export { ConfirmDialog } from "./components/primitives/ConfirmDialog";
export { Divider } from "./components/primitives/Divider";
export { EmptyState } from "./components/primitives/EmptyState";
export { ErrorNote } from "./components/primitives/ErrorNote";
export { Group } from "./components/primitives/Group";
export { IconButton } from "./components/primitives/IconButton";
export { ListRow } from "./components/primitives/ListRow";
export { Loading } from "./components/primitives/Loading";
export { MatchBadge } from "./components/primitives/MatchBadge";
export { OptionPill } from "./components/primitives/OptionPill";
export { Rating } from "./components/primitives/Rating";
export { SearchField } from "./components/primitives/SearchField";
export { Section } from "./components/primitives/Section";
export { Segmented } from "./components/primitives/Segmented";
export { Skeleton } from "./components/primitives/Skeleton";
export { SongArt } from "./components/primitives/SongArt";
export { Spinner } from "./components/primitives/Spinner";
export { StarInput } from "./components/primitives/StarInput";
export { StarRow } from "./components/primitives/StarRow";
export { StepHeader } from "./components/primitives/StepHeader";
export { Stepper } from "./components/primitives/Stepper";
export { TextField } from "./components/primitives/TextField";
export { Toast } from "./components/primitives/Toast";
export { Toggle } from "./components/primitives/Toggle";
export { Wordmark } from "./components/primitives/Wordmark";

// Scaffolding
export { AppBar } from "./components/scaffolding/AppBar";
export { BottomBar } from "./components/scaffolding/BottomBar";
export { Screen } from "./components/scaffolding/Screen";

// Domain composites
export { ChatBubble, shouldShowChatName } from "./components/domain/ChatBubble";
export { FriendRow } from "./components/domain/FriendRow";
export { NotificationRow } from "./components/domain/NotificationRow";
export { PartyCard } from "./components/domain/PartyCard";
export type { PartyCardVariant } from "./components/domain/PartyCard";
export { ReviewCard } from "./components/domain/ReviewCard";
export { SongRow } from "./components/domain/SongRow";
export { UserProfileHeader } from "./components/domain/UserProfileHeader";
export { VenueCard } from "./components/domain/VenueCard";
export { VenueLocationCard } from "./components/domain/VenueLocationCard";

// Utils
export { avatarColor, initial } from "./utils/avatar";
export { formatAgo, formatDayLabel, formatTime, formatWhen, money, plural } from "./utils/format";
export { useAsync, useDebounced } from "./utils/hooks";

// Types
export * from "./types";
