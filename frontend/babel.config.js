module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Must stay last in the plugins list - react-native-reanimated's own
    // docs require this since it rewrites worklet functions after every
    // other transform has run.
    plugins: ["react-native-reanimated/plugin"],
  };
};
