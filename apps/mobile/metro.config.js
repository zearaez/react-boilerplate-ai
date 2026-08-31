const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * THREE LINES. Do not add more.
 *
 * Expo's Metro config has auto-detected monorepos since SDK 52. If you add
 * `watchFolders`, `resolver.nodeModulesPaths`, `resolver.extraNodeModules`, or
 * `resolver.disableHierarchicalLookup`, you will OVERRIDE that detection and
 * break pnpm resolution — those snippets are SDK 51-and-earlier advice that is
 * still all over the internet.
 *
 * If module resolution breaks, the fix is almost always
 * `pnpm install && npx expo start --clear`, or a duplicate dependency that
 * `node scripts/assert-single-version.mjs` will name for you.
 *
 * (CommonJS on purpose: Metro loads this before any ESM transform runs, which is
 * also why apps/mobile/package.json must not say "type": "module". It is
 * excluded from linting by the `**\/*.config.js` ignore in
 * packages/config/eslint/base.js, so it needs no eslint-disable.)
 */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
