import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SkillsService } from '../../data-access/skills.service';
import { ModelStacksService } from '../../../model-stacks/data-access/model-stacks.service';

@Component({
  selector: 'app-skill-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './skill-detail.html',
  styleUrl: './skill-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillDetail {
  private readonly service = inject(SkillsService);
  private readonly stacksService = inject(ModelStacksService);
  private readonly route = inject(ActivatedRoute);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly skill = computed(() => this.service.getById(this.id() ?? ''));
  readonly stack = computed(() => {
    const stackId = this.skill()?.model_stack_id;
    return stackId ? this.stacksService.getById(stackId) : null;
  });

  // Hub path for reference — the actual prompt lives in hermes/skills/{id}/SKILL.md
  readonly hubPath = computed(() => `hermes/skills/${this.id()}/SKILL.md`);
}
