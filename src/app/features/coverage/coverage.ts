export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface FileCoverage {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export type CoverageSummary = Record<string, FileCoverage>;

export interface FileRow {
  path: string;
  label: string;
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}
