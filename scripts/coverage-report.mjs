import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';

const root = resolve(import.meta.dirname, '..');
const input = resolve(root, 'coverage/dashboard/coverage-summary.json');
const output = resolve(root, 'src/assets/coverage-summary.json');

const raw = JSON.parse(readFileSync(input, 'utf8'));

const summary = Object.fromEntries(
  Object.entries(raw).map(([key, value]) => [
    key === 'total' ? 'total' : relative(root, key),
    value,
  ])
);

writeFileSync(output, JSON.stringify(summary, null, 2));
console.log(`Coverage report written to src/assets/coverage-summary.json`);
