import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { SkillsService } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName } from '@domain/skills';

@Component({
  selector: 'app-skill-detail',
  imports: [RouterLink],
  templateUrl: './skill-detail.html',
  styleUrl: './skill-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillDetail {
  private readonly service = inject(SkillsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  constructor() {
    effect(() => {
      const s = this.skill();
      if (s) this.titleService.setTitle(formatPageTitle(s.display_name));
    });
  }

  private readonly id = toSignal(
    this.route.paramMap.pipe(map(p => `${p.get('namespace')}/${p.get('name')}`)),
  );

  readonly skill = computed(() => this.service.getById(this.id() ?? ''));

  readonly namespace = computed(() => {
    const id = this.id();
    return id ? skillNamespace(this.skill()?.id ?? id as any) : null;
  });

  readonly localName = computed(() => {
    const id = this.id();
    return id ? skillLocalName(this.skill()?.id ?? id as any) : '';
  });

  // Human-readable cache freshness string derived from last_indexed_at.
  readonly syncedAgo = computed(() => {
    const ts = this.skill()?.last_indexed_at;
    if (!ts) return 'never synced';
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 48) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  });

  formatSchema(schema: unknown): string {
    if (schema == null) return '';
    try {
      return JSON.stringify(schema, null, 2);
    } catch {
      return String(schema);
    }
  }
}
