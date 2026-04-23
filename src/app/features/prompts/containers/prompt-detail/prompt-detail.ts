import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { map } from 'rxjs';
import { PromptsService } from '../../data-access/prompts.service';
import type { PromptVersion } from '../../utils/prompt.types';

@Component({
  selector: 'app-prompt-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './prompt-detail.html',
  styleUrl: './prompt-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptDetail {
  private readonly service = inject(PromptsService);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));

  readonly prompt = computed(() => {
    const id = this.id();
    return id ? this.service.getById(id) : undefined;
  });

  readonly versions = signal<PromptVersion[]>([]);
  readonly versionsLoading = signal(true);

  readonly currentVersion = computed(() => {
    const p = this.prompt();
    if (!p?.current_version_id) return undefined;
    return this.versions().find(v => v.id === p.current_version_id);
  });

  constructor() {
    // switchMap cancels in-flight request if id changes (unlikely but correct).
    toObservable(this.id).pipe(
      filter(Boolean),
      switchMap(id => this.service.loadVersions(id)),
    ).subscribe({
      next: vs => { this.versions.set(vs); this.versionsLoading.set(false); },
      error: ()  => this.versionsLoading.set(false),
    });
  }

  promote(versionId: string): void {
    const id = this.id();
    if (!id) return;
    this.service.promoteVersion(id, versionId);
  }
}
