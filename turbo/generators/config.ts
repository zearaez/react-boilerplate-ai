import type { PlopTypes } from '@turbo/gen';

/**
 * NOTE ON FORMATTING: this generator deliberately does NOT run eslint --fix
 * itself.
 *
 * It has to be a separate step, because an appended import line lands wherever
 * its anchor is, while `import-x/order` requires imports to be contiguous and
 * alphabetised — and no fixed anchor position can satisfy that for an arbitrary
 * feature name. So generated code always needs one `pnpm fix`.
 *
 * Running it from inside a plop action was tried and reverted: spawning a nested
 * package manager while `turbo gen` owns the terminal hangs indefinitely, and a
 * generator that hangs is far worse than one that asks for a follow-up command.
 * The instruction is in the completion message instead, and `/new-feature` runs it.
 * It is `pnpm fix`, not `pnpm lint:fix`: Prettier is a separate step from ESLint in
 * this repo, so generated files need both.
 */

/**
 * `pnpm gen feature` — scaffolds a complete vertical slice.
 *
 * THIS IS THE SHARED UI LAYER.
 *
 * The repo deliberately shares no UI components, so parity between web and mobile
 * cannot be enforced at runtime. It is enforced HERE instead, at generation time:
 * both platforms' templates are written against the same hook signature and
 * render the same states in the same order, and their `Props` types are
 * byte-identical because they come from one invocation with one set of answers.
 * Each generated file carries a `Counterpart:` header pointing at its twin.
 *
 * Non-interactive form, which is what an agent should use:
 *   pnpm gen feature --args comment comments /api/comments
 */
export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('feature', {
    description:
      'A full vertical slice: core (schema/api/keys/hooks) + mocks + web pages + mobile screens',

    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Singular resource name, kebab-case (e.g. comment):',
        validate: (value: string) =>
          /^[a-z][a-z0-9-]*$/.test(value) || 'Lowercase letters, digits and dashes only.',
      },
      {
        type: 'input',
        name: 'plural',
        message: 'Plural form, kebab-case (e.g. comments):',
        validate: (value: string) =>
          /^[a-z][a-z0-9-]*$/.test(value) || 'Lowercase letters, digits and dashes only.',
      },
      {
        type: 'input',
        name: 'apiPath',
        message: 'API path (e.g. /api/comments):',
        default: '/api/{{plural}}',
      },
    ],

    actions: [
      // ---------------- @repo/core -------------------------------------------
      {
        type: 'add',
        path: 'packages/core/src/features/{{plural}}/schemas.ts',
        templateFile: 'templates/core/schemas.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/features/{{plural}}/keys.ts',
        templateFile: 'templates/core/keys.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/features/{{plural}}/api.ts',
        templateFile: 'templates/core/api.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/features/{{plural}}/hooks.ts',
        templateFile: 'templates/core/hooks.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/features/{{plural}}/index.ts',
        templateFile: 'templates/core/index.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/features/{{plural}}/__tests__/hooks.test.ts',
        templateFile: 'templates/core/hooks.test.ts.hbs',
      },
      {
        type: 'append',
        path: 'packages/core/src/index.ts',
        pattern: /(\/\/ @gen:exports)/,
        template: "export * from './features/{{plural}}';",
      },

      // ---------------- @repo/mocks ------------------------------------------
      {
        type: 'add',
        path: 'packages/mocks/src/fixtures/{{plural}}.ts',
        templateFile: 'templates/mocks/fixtures.ts.hbs',
      },
      {
        type: 'add',
        path: 'packages/mocks/src/handlers/{{plural}}.ts',
        templateFile: 'templates/mocks/handlers.ts.hbs',
      },
      // TWO appends, not one: the spread AND the import. Forgetting the import is
      // the bug this generator shipped with first time round, and it only shows
      // up at typecheck, one step after "Success!".
      {
        type: 'append',
        path: 'packages/mocks/src/handlers/index.ts',
        pattern: /(\/\/ @gen:handler-imports)/,
        template: "import { {{camelCase plural}}Handlers } from './{{plural}}';",
      },
      {
        type: 'append',
        path: 'packages/mocks/src/handlers/index.ts',
        pattern: /(\/\/ @gen:handlers)/,
        template: '  ...{{camelCase plural}}Handlers,',
      },

      // ---------------- apps/web --------------------------------------------
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/{{name}}-card.tsx',
        templateFile: 'templates/web/card.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/{{name}}-form.tsx',
        templateFile: 'templates/web/form.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/{{plural}}-list-page.tsx',
        templateFile: 'templates/web/list-page.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/{{name}}-detail-page.tsx',
        templateFile: 'templates/web/detail-page.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/{{name}}-create-page.tsx',
        templateFile: 'templates/web/create-page.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/{{name}}-edit-page.tsx',
        templateFile: 'templates/web/edit-page.tsx.hbs',
      },
      {
        // Generated features ship with a test. Without one, every `gen feature`
        // would drag global coverage down and the gate would fail on code the
        // generator itself wrote.
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/__tests__/{{plural}}-list-page.test.tsx',
        templateFile: 'templates/web/list-page.test.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/web/src/features/{{plural}}/__tests__/{{name}}-crud-pages.test.tsx',
        templateFile: 'templates/web/crud-pages.test.tsx.hbs',
      },
      {
        // Route order matters: 'new' must precede ':id', or React Router matches
        // /{{plural}}/new as a detail view with id="new".
        type: 'append',
        path: 'apps/web/src/router.tsx',
        pattern: /(\/\/ @gen:routes)/,
        template: [
          '          {',
          "            path: '{{plural}}',",
          '            lazy: async () => ({',
          "              Component: (await import('@/features/{{plural}}/{{plural}}-list-page'))",
          '                .{{pascalCase plural}}ListPage,',
          '            }),',
          '          },',
          '          {',
          "            path: '{{plural}}/new',",
          '            lazy: async () => ({',
          "              Component: (await import('@/features/{{plural}}/{{name}}-create-page'))",
          '                .{{pascalCase name}}CreatePage,',
          '            }),',
          '          },',
          '          {',
          "            path: '{{plural}}/:id',",
          '            lazy: async () => ({',
          "              Component: (await import('@/features/{{plural}}/{{name}}-detail-page'))",
          '                .{{pascalCase name}}DetailPage,',
          '            }),',
          '          },',
          '          {',
          "            path: '{{plural}}/:id/edit',",
          '            lazy: async () => ({',
          "              Component: (await import('@/features/{{plural}}/{{name}}-edit-page'))",
          '                .{{pascalCase name}}EditPage,',
          '            }),',
          '          },',
        ].join('\n'),
      },

      // ---------------- apps/mobile ------------------------------------------
      {
        type: 'add',
        path: 'apps/mobile/components/{{name}}-card.tsx',
        templateFile: 'templates/mobile/card.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/mobile/components/{{name}}-form.tsx',
        templateFile: 'templates/mobile/form.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/mobile/app/(app)/{{plural}}/index.tsx',
        templateFile: 'templates/mobile/list-screen.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/mobile/app/(app)/{{plural}}/new.tsx',
        templateFile: 'templates/mobile/create-screen.tsx.hbs',
      },
      {
        // [id]/index.tsx, not [id].tsx — the sibling edit.tsx would otherwise be a
        // route collision.
        type: 'add',
        path: 'apps/mobile/app/(app)/{{plural}}/[id]/index.tsx',
        templateFile: 'templates/mobile/detail-screen.tsx.hbs',
      },
      {
        type: 'add',
        path: 'apps/mobile/app/(app)/{{plural}}/[id]/edit.tsx',
        templateFile: 'templates/mobile/edit-screen.tsx.hbs',
      },
      {
        type: 'append',
        path: 'apps/mobile/app/(app)/_layout.tsx',
        pattern: /(\{\/\* @gen:screens \*\/\})/,
        // `\\{{` is the Handlebars escape for a literal `{{`. Without it, JSX like
        // `options={{ title: '' }}` is parsed as a (malformed) mustache and the
        // whole generator aborts.
        template: [
          '      <Stack.Screen',
          '        name="{{plural}}/new"',
          "        options=\\{{ title: t('posts.new'), presentation: 'modal' }}",
          '      />',
          '      <Stack.Screen name="{{plural}}/[id]/index" options=\\{{ title: \'\' }} />',
          '      <Stack.Screen',
          '        name="{{plural}}/[id]/edit"',
          "        options=\\{{ title: t('posts.editTitle') }}",
          '      />',
        ].join('\n'),
      },

      // ---------------- next steps ------------------------------------------
      () =>
        [
          '',
          'Generated. Now, in this order:',
          '',
          '  1. pnpm fix',
          '     Required, not optional. Runs eslint --fix (appended imports land next',
          '     to their anchor and must be re-sorted) AND prettier --write, which are',
          '     separate steps here. See the note at the top of',
          '     turbo/generators/config.ts.',
          '',
          '  2. Replace the placeholder fields in',
          '     packages/core/src/features/<plural>/schemas.ts with the real ones,',
          '     then make packages/mocks/src/fixtures/<plural>.ts match.',
          '',
          '  3. pnpm quality:check',
          '',
          'After step 1 the slice passes the gate untouched. If it does not, that is a',
          'bug in the template, not in your feature — fix the template.',
          '',
        ].join('\n'),
    ],
  });
}
