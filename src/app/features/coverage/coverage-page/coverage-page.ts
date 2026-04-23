import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CoverageService } from '../coverage.service';
import type { FileRow } from '../coverage';

@Component({
  selector: 'app-coverage-page',
  imports: [DecimalPipe],
  templateUrl: './coverage-page.html',
  styleUrl: './coverage-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoveragePage {
  private readonly service = inject(CoverageService);

  readonly total = computed(() => this.service.summary()?.['total']);

  readonly files = computed<FileRow[]>(() => {
    const summary = this.service.summary();
    if (!summary) return [];
    return Object.entries(summary)
      .filter(([key]) => key !== 'total' && key.startsWith('src/'))
      .map(([path, cov]) => ({
        path,
        label: path.replace('src/app/', ''),
        lines: cov.lines.pct,
        statements: cov.statements.pct,
        functions: cov.functions.pct,
        branches: cov.branches.pct,
      }))
      .sort((a, b) => a.lines - b.lines);
  });

  pctClass(pct: number): string {
    if (pct >= 80) return 'pct pct--high';
    if (pct >= 50) return 'pct pct--mid';
    return 'pct pct--low';
  }
}
