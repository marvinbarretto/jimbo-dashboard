import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkillsService } from '../../data-access/skills.service';
import { skillNamespace, skillLocalName, type Skill } from '@domain/skills';
import { TableShell } from '@shared/components/table-shell/table-shell';

@Component({
  selector: 'app-skills-list',
  imports: [RouterLink, TableShell],
  templateUrl: './skills-list.html',
  styleUrl: './skills-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsList {
  private readonly service = inject(SkillsService);

  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  // Sort by last_used desc (most recent first), unused at the bottom.
  // Drives the dashboard's "what am I actually using" question — if it
  // sat at the bottom for months it's a candidate to retire or rework.
  readonly skills = computed<readonly Skill[]>(() => {
    return [...this.service.skills()].sort((a, b) => {
      const aTime = a.last_used ?? '';
      const bTime = b.last_used ?? '';
      if (aTime && !bTime) return -1;
      if (!aTime && bTime) return 1;
      if (aTime !== bTime) return bTime.localeCompare(aTime);
      return a.id.localeCompare(b.id);
    });
  });

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

  // Coarse relative time so the table doesn't churn while the user reads it.
  // Absolute ISO is on the title attr in the template for hover detail.
  lastUsedLabel(iso: string | undefined): string {
    if (!iso) return 'never';
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return iso;
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return 'just now';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }
}
