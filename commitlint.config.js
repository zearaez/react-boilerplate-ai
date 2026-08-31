/**
 * Conventional Commits, per the OutCode git branching strategy.
 * See docs/outcode-git-branching-strategy.md.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['web', 'mobile', 'core', 'tokens', 'mocks', 'config', 'ci', 'docs', 'deps', 'repo'],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'body-max-line-length': [0],
  },
};
