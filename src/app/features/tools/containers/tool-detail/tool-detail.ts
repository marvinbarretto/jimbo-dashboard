import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { filter, switchMap, map } from 'rxjs';
import { DatePipe, JsonPipe } from '@angular/common';
import { formatPageTitle } from '@app/app-title-strategy';
import { ToolsService } from '../../data-access/tools.service';
import type { ToolVersion } from '../../utils/tool.types';

@Component({
  selector: 'app-tool-detail',
  imports: [RouterLink, DatePipe, JsonPipe],
  templateUrl: './tool-detail.html',
  styleUrl: './tool-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolDetail {
  private readonly service = inject(ToolsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id'))));

  readonly tool = computed(() => {
    const id = this.id();
    return id ? this.service.getById(id) : undefined;
  });

  readonly versions = signal<ToolVersion[]>([]);
  readonly versionsLoading = signal(true);

  readonly currentVersion = computed(() => {
    const t = this.tool();
    if (!t?.current_version_id) return undefined;
    return this.versions().find(v => v.id === t.current_version_id);
  });

  constructor() {
    toObservable(this.id).pipe(
      filter(Boolean),
      switchMap(id => this.service.loadVersions(id)),
    ).subscribe({
      next: vs => { this.versions.set(vs); this.versionsLoading.set(false); },
      error: ()  => this.versionsLoading.set(false),
    });

    effect(() => {
      const t = this.tool();
      if (t) this.titleService.setTitle(formatPageTitle(t.display_name));
    });
  }

  promote(versionId: string): void {
    const id = this.id();
    if (!id) return;
    this.service.promoteVersion(id, versionId);
  }
}
