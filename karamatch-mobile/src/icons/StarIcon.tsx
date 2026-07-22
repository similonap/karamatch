import Svg, { Path } from "react-native-svg";

const STAR_PATH = "M12 3.6l2.6 5.3 5.8.9-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.8l5.8-.9Z";

/** A filled star, for ratings — the outline form reads as "not rated". */
export function StarIcon({ size = 14, color, filled = true }: { size?: number; color: string; filled?: boolean }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d={STAR_PATH}
                fill={filled ? color : "none"}
                stroke={color}
                strokeWidth={filled ? 0 : 1.75}
                strokeLinejoin="round"
            />
        </Svg>
    );
}
