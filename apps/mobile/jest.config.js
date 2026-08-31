const expoPreset = require('jest-expo/jest-preset');

/**
 * jest-expo, because Metro's resolver and React Native's Flow-typed source need
 * the Expo preset. Vitest handles everything else in the repo.
 *
 * The two merges below are the whole point of this file, and both are easy to get
 * wrong:
 *
 * 1. transformIgnorePatterns — jest-expo ships ONE negative-lookahead pattern
 *    listing every package that must be transformed. You cannot add a pattern to
 *    un-ignore something, because a file is ignored if ANY pattern matches; the
 *    entries have to go INSIDE that lookahead. Replacing the preset's list
 *    outright (the obvious thing to write) breaks expo-router, reanimated and
 *    friends. We only need to add our own workspace packages, which arrive as
 *    symlinks under node_modules thanks to `nodeLinker: hoisted`.
 *
 * 2. moduleNameMapper — the preset maps image/font imports to stubs. Setting a
 *    top-level moduleNameMapper REPLACES that, so every asset import in a test
 *    would explode. Spread it.
 */
const EXTRA_TRANSFORMED = ['@repo', 'nativewind', 'react-native-css-interop'];

const transformIgnorePatterns = expoPreset.transformIgnorePatterns.map((pattern) =>
  pattern.includes('(?!(')
    ? pattern.replace('(?!(', `(?!(${EXTRA_TRANSFORMED.join('|')}|`)
    : pattern,
);

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns,
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^~/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['components/**/*.tsx', 'lib/**/*.ts', '!**/__tests__/**'],
};
