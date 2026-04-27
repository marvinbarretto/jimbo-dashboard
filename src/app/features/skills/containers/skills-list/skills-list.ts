import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkillsService } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName } from '@domain/skills';

@Component({
  selector: 'app-skills-list',
  imports: [RouterLink],
  templateUrl: './skills-list.html',
  styleUrl: './skills-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsList {
  private readonly service = inject(SkillsService);

  readonly skills = this.service.skills;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  namespace = skillNamespace;
  localName = skillLocalName;

  // Routes split slash-paths into segments — `/skills/:category/:name`.
  skillLink(id: string): string[] {
    return id.split('/');
  }

  // Skills are filesystem-managed; `metadata.is_active !== false` is "live".
  isActive(skill: { metadata: { is_active?: boolean } }): boolean {
    return skill.metadata.is_active !== false;
  }
}
