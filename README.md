# Dashboard

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Commit → vault linking

Reference a vault item in a commit message and the board updates itself. A bare
`LOC-3062` (project short_code + seq, shown on cards) logs the commit to that
item's history; `Closes: LOC-3062` marks it done. Applied within ~15 min of
pushing. Full convention: [`jimbo-api/docs/commit-vault-linking.md`](../jimbo-api/docs/commit-vault-linking.md).

## Releasing

`npm run release` (standard-version: version bump + CHANGELOG + tag), then
`git push --follow-tags`. Never a bare `git push`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
