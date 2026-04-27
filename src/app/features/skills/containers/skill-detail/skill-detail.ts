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
      if (s) this.titleService.setTitle(formatPageTitle(s.name));
    });
  }

  private readonly id = toSignal(
    this.route.paramMap.pipe(map(p => `${p.get('namespace')}/${p.get('name')}`)),
  );

  readonly skill = computed(() => this.service.getById(this.id() ?? ''));
  readonly isLoading = this.service.isLoading;

  readonly namespace = computed(() => {
    const id = this.id();
    return id ? skillNamespace(id) : null;
  });

  readonly localName = computed(() => {
    const id = this.id();
    return id ? skillLocalName(id) : '';
  });

  readonly isActive = computed(() => this.skill()?.metadata.is_active !== false);
}
