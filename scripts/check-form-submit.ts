/**
 * Static check: no <form> may bind (ngSubmit) without a directive to claim it.
 *
 * (ngSubmit) is not a DOM event — it's an output on Angular's form directives,
 * NgForm (from FormsModule) or FormGroupDirective (from [formGroup] /
 * [formRoot]). On a <form> with neither, it becomes a listener for an event
 * nothing ever raises: the browser submits natively, the page full-reloads, and
 * none of the handler runs.
 *
 * This has shipped twice — answer-rail, then the briefing miss-note dialog,
 * where it swallowed every ▼ miss for nine days because the page reloaded
 * before the dialog could return its note. Both were single-control forms bound
 * with a bare [formControl], which looks like enough and isn't.
 *
 * Static rather than a component test because it fails as a page reload, not an
 * error: nothing throws, nothing logs, and a passing render proves nothing. And
 * because the fix belongs to the class, not the component — every template gets
 * checked, not whichever one someone remembered to cover.
 *
 * Run: npx tsx scripts/check-form-submit.ts   (wired into `npm run lint`)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_DIR = join(process.cwd(), 'src/app');

/** Anything that puts a form directive on the <form>, and so claims submit. */
const CLAIMS_SUBMIT = /\[formGroup]|\[formRoot]|formGroupName|\bngForm\b/;
const FORM_TAG = /<form\b[^>]*>/g;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, out);
    else if (entry.name.endsWith('.html') || entry.name.endsWith('.ts')) out.push(path);
  }
  return out;
}

/**
 * The component backing a template: itself when the template is inline, the
 * sibling .ts when it's external. FormsModule in its imports means NgForm
 * attaches to every <form> there — a legitimate way to claim submit.
 */
function importsFormsModule(file: string): boolean {
  const ts = file.endsWith('.ts') ? file : file.replace(/\.html$/, '.ts');
  try {
    return /\bFormsModule\b/.test(readFileSync(ts, 'utf8'));
  } catch {
    return false;
  }
}

const offenders: string[] = [];
let checked = 0;

for (const file of sourceFiles(APP_DIR)) {
  if (file.endsWith('.spec.ts')) continue;
  const source = readFileSync(file, 'utf8');
  for (const [tag] of source.matchAll(FORM_TAG)) {
    if (!tag.includes('(ngSubmit)')) continue;
    checked++;
    if (CLAIMS_SUBMIT.test(tag) || importsFormsModule(file)) continue;
    offenders.push(`  ${relative(process.cwd(), file)}\n    ${tag}`);
  }
}

// A silent zero would mean the walk found nothing and reported success. Say the
// denominator so a green result is evidence rather than an absence.
if (checked === 0) {
  console.error('✗ form-submit check scanned 0 (ngSubmit) forms — the walk is broken, not the code');
  process.exit(1);
}

if (offenders.length > 0) {
  console.error(
    `✗ ${offenders.length} of ${checked} (ngSubmit) form(s) have no directive to claim submit.\n` +
    `  These full-page-reload on submit and their handlers never run.\n` +
    `  Fix: bind a [formGroup] (wrap even a single control in a FormGroup), or import FormsModule.\n\n` +
    offenders.join('\n\n'),
  );
  process.exit(1);
}

console.log(`✓ ${checked} (ngSubmit) forms all have a directive to claim submit`);
