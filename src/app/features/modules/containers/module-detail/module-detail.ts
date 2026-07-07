import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBreadcrumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';
import type { Crumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { ModuleDocsService } from '../../data-access/module-docs.service';
import { ModuleStalenessBadge } from '../../components/staleness-badge/staleness-badge';
import type { ModuleDoc } from '../../data-access/module-doc';

// Discriminated union so the template can't render a doc that isn't there.
type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; doc: ModuleDoc };

@Component({
  selector: 'app-module-detail',
  imports: [
    RouterLink,
    UiBreadcrumb,
    UiCard,
    UiEmptyState,
    UiLoadingState,
    UiMetaList,
    UiPageHeader,
    UiSection,
    UiStack,
    MarkdownPipe,
    ModuleStalenessBadge,
  ],
  templateUrl: './module-detail.html',
  styleUrl: './module-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleDetail {
  private readonly service = inject(ModuleDocsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  private readonly state = toSignal(
    this.route.paramMap.pipe(
      map(p => p.get('module') ?? ''),
      switchMap(name =>
        this.service.getDoc(name).pipe(
          map((doc): LoadState => ({ status: 'loaded', doc })),
          startWith<LoadState>({ status: 'loading' }),
          catchError(() => of<LoadState>({ status: 'error' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LoadState },
  );

  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly hasError = computed(() => this.state().status === 'error');
  readonly doc = computed(() => {
    const s = this.state();
    return s.status === 'loaded' ? s.doc : null;
  });

  readonly crumbs = computed<readonly Crumb[]>(() => [
    { label: 'Module docs', link: ['/modules'] },
    { label: this.doc()?.module ?? '…' },
  ]);

  constructor() {
    effect(() => {
      const doc = this.doc();
      if (doc) this.titleService.setTitle(formatPageTitle(doc.module));
    });
  }
}
