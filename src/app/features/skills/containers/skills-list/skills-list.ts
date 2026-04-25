import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkillsService } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName } from '../../../../domain/skills';

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

  namespace = skillNamespace;
  localName = skillLocalName;

  skillLink(id: string): string[] {
    return id.split('/');
  }

  editLink(id: string): string[] {
    return [...id.split('/'), 'edit'];
  }

  remove(id: string): void {
    if (confirm(`Remove skill ${id}?`)) {
      this.service.remove(id);
    }
  }
}
