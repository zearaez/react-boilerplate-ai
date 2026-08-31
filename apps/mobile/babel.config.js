/**
 * Order in this file is load-bearing.
 *
 *   - `jsxImportSource: 'nativewind'` is what makes `className` work at all.
 *     Without it every className is silently ignored — no error, no styles.
 *   - `react-native-worklets/plugin` MUST BE LAST. Reanimated 4 moved its plugin
 *     here from `react-native-reanimated/plugin`; putting it anywhere but last
 *     produces cryptic worklet runtime errors that look like Reanimated bugs.
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      // MUST BE LAST.
      'react-native-worklets/plugin',
    ],
  };
};
