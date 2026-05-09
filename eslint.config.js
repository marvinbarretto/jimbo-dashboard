// @ts-check
//
// ESLint flat config for the dashboard.
//
// Philosophy: this config grows by addition, one architectural rule at a
// time. Each rule:
//   1. lives here as enforcement
//   2. has a corresponding entry in docs/architecture/lint-rules.md (rule
//      ID, what / why / scope / known violations / planned tightening)
//
// We deliberately do NOT extend the typescript-eslint or angular-eslint
// "recommended" rulesets. Those bundle stylistic preferences (no-explicit-any,
// no-output-native, no-unused-vars) that don't match our existing conventions
// and would generate hundreds of false-positive errors on day one. We turn on
// the rules we want, one by one, with a documented reason.
//
// Adding a rule? Read docs/architecture/lint-rules.md first.

const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  // ── TypeScript files ───────────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'dist-api/**',
      'coverage/**',
      '.angular/**',
      'src/app/domain/api-types.generated.ts',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@angular-eslint': angular.tsPlugin,
    },
    rules: {
      // ── Angular conventions matching .claude/CLAUDE.md ────────────────
      // Selector prefixes — caught at lint time so new components pick up
      // the convention without code review nudges.
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // ── Architectural boundary: VAULT-COMMANDS-001 ────────────────────
      // Components and shared primitives must not import data-access service
      // modules directly. Mutations go through the command layer
      // (features/*/commands/*-commands.ts); reads happen via the dedicated
      // signal getters that boards and dialogs already use.
      //
      // Path-level enforcement, not method-level — a follow-up will split
      // each service into read-only + mutation surfaces so the rule can
      // tighten further. Until then, `containers/`, `dialog/`, `commands/`,
      // and `data-access/` are exempt because they legitimately need read
      // access to the service signals.
      //
      // See docs/architecture/lint-rules.md (rule VAULT-COMMANDS-001).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/data-access/*.service',
                '**/data-access/*.service.ts',
                '@features/*/data-access/*.service',
              ],
              message:
                'Components must not import data-access services. Use the command layer (features/*/commands/) for mutations. See docs/architecture/lint-rules.md (VAULT-COMMANDS-001).',
            },
          ],
        },
      ],
    },
  },

  // ── Exemptions for VAULT-COMMANDS-001 ─────────────────────────────────
  // These directories own the legitimate seam to the data layer:
  //   - commands/    : the application-service layer (the whole point)
  //   - data-access/ : services compose with each other
  //   - containers/  : board components need read-only signal access
  //   - dialog/      : dialog-store reaches into multiple services for reads
  //
  // When a new directory legitimately needs service access, add it here AND
  // record the reasoning in docs/architecture/lint-rules.md.
  {
    files: [
      '**/commands/**/*.ts',
      '**/data-access/**/*.ts',
      '**/containers/**/*.ts',
      '**/dialog/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Test files: unit tests inevitably reach into services to exercise
  // behaviour; that's the point of integration-style specs.
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // ── Known violations of VAULT-COMMANDS-001 ────────────────────────────
  // Legacy code authored before the boundary existed. Each entry is tracked
  // in docs/architecture/lint-rules.md with a refactor plan. As files get
  // converted to use commands/ or get split into read-only signal surfaces,
  // remove them from this list — the shrinking list IS the maturity ratchet.
  //
  // Don't add new entries without a corresponding doc update. The whole
  // point of an explicit list is that nobody silently widens the scope.
  {
    files: [
      // Shared primitive reaching into 3 services for @-mention triggers.
      // Will resolve when actors/projects/vault-items expose readonly views.
      'src/app/shared/components/smart-composer-input/**/*.ts',

      // grooming-card pulls thread + vault-items for live snapshots; the
      // board container should be the only thing reaching the services and
      // pass everything down via the card-context interface.
      'src/app/features/grooming/components/grooming-card/grooming-card.ts',

      // mail-activity-page is a feature container without a `containers/`
      // folder. Should move into containers/ subfolder OR migrate reads
      // through a command/query layer.
      'src/app/features/mail-activity/mail-activity-page.ts',

      // mail-dataset-card reads aggregated data straight from jimbo-data;
      // the parent should pass enriched data via inputs.
      'src/app/features/mail/components/mail-dataset-card/mail-dataset-card.ts',

      // question-card reads actors + vault-items for inline rendering;
      // parent container should resolve and pass via inputs.
      'src/app/features/questions/components/question-card/question-card.ts',

      // cron-jobs.service.ts lives at the feature root rather than in
      // data-access/ — should move under data-access/ and the rule's
      // standard exemption will cover it. Cosmetic; no behaviour change.
      'src/app/features/stream/cron-jobs.service.ts',

      // stream-page is a feature container without a `containers/` folder.
      // Same fix as mail-activity-page.
      'src/app/features/stream/stream-page/stream-page.ts',

      // thread message-composer + thread-view are leaf components reaching
      // into thread + attachments services. Parent thread-page should own
      // the data and inject via inputs / outputs.
      'src/app/features/thread/components/message-composer/message-composer.ts',
      'src/app/features/thread/components/thread-view/thread-view.ts',

      // app.ts is the root component and bootstraps several services as a
      // side effect of construction. Acceptable for the app shell; will
      // re-evaluate if/when these services move to APP_INITIALIZER.
      'src/app/app.ts',

      // Top-level api-data feature lives at feature root without a
      // containers/ split. Same shape as mail-activity-page.
      'src/app/features/api-data/data-pages.ts',
      'src/app/features/api-data/components/dataset-card/dataset-card.ts',
      'src/app/features/api-data/components/endpoint-panel/endpoint-panel.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
