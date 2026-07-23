const { getDefaultConfig } = require("expo/metro-config");
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

const config = getDefaultConfig(__dirname);

// Generates .rnstorybook/storybook.requires from the `stories` glob in
// .rnstorybook/main.ts every time Metro starts. `enabled: false` strips
// Storybook from the bundle entirely — same EXPO_PUBLIC_STORYBOOK flag
// App.tsx reads to pick Storybook vs. PlaceholderApp at runtime, so
// `npm run start:app` both switches the screen and drops Storybook's own
// code out of that bundle.
module.exports = withStorybook(config, {
    enabled: process.env.EXPO_PUBLIC_STORYBOOK !== "false"
});
