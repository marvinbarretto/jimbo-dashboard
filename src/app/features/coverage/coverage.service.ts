import { Injectable, signal } from '@angular/core';
import type { CoverageSummary } from './coverage';
import summaryJson from '../../../assets/coverage-summary.json';

@Injectable({ providedIn: 'root' })
export class CoverageService {
  readonly summary = signal<CoverageSummary>(summaryJson as CoverageSummary);
}
