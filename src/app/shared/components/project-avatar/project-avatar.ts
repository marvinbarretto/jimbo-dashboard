import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProjectAvatarSize = 'sm' | 'md' | 'lg';
export type ProjectAvatarVariant = 'filled' | 'outlined';

// Tokenize on whitespace / dash / underscore AND CamelCase boundaries so
// "LocalShout" → "LS", "Reinvent Me" → "RM", "Hermes" → "H". Single-letter
// fallback when the name is one token (consistent with ActorAvatar). Guards
// against a transiently-undefined name — e.g. a consumer rendering this
// mid-drag before its own data has fully resolved — rather than throwing.
function projectInitials(name: string | undefined): string {
  if (!name) return '?';
  const tokens = name
    .split(/[\s\-_]+/)
    .flatMap(t => t.split(/(?=[A-Z])/))
    .filter(Boolean);
  if (tokens.length === 0) return '?';
  return tokens.slice(0, 2).map(t => t[0]!.toUpperCase()).join('');
}

@Component({
  selector: 'app-project-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="cls()"
    [style.--chip-color]="color() ?? null"
    [attr.title]="name()"
    [attr.aria-label]="name()"
  >{{ initials() }}</span>`,
  styles: [`
    /* Rounded-square (not a circle) — distinguishes "thing/project" from
       "person/actor" at a glance. Actors are round, projects are squared.
       Industry convention from GitHub orgs, Slack channels, Linear projects. */
    .project-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 25%;
      font-family: var(--font-mono);
      font-weight: 600;
      line-height: 1;
      flex-shrink: 0;
      vertical-align: middle;
      letter-spacing: -0.02em;
    }
    .project-avatar--sm { width: 1rem;     height: 1rem;     font-size: 0.5rem;  border-width: 1.25px; }
    .project-avatar--md { width: 1.375rem; height: 1.375rem; font-size: 0.6rem;  border-width: 1.5px;  }
    .project-avatar--lg { width: 2rem;     height: 2rem;     font-size: 0.78rem; border-width: 2px;    }

    .project-avatar--filled {
      background: var(--chip-color, var(--color-border));
      color: var(--color-bg);
      border: 1.5px solid var(--chip-color, var(--color-border));
    }
    .project-avatar--outlined {
      background: transparent;
      color: var(--chip-color, var(--color-text-muted));
      border: 1.5px solid var(--chip-color, var(--color-border));
    }
  `],
})
export class ProjectAvatar {
  readonly name    = input.required<string>();
  readonly color   = input<string | null>(null);
  readonly size    = input<ProjectAvatarSize>('md');
  readonly variant = input<ProjectAvatarVariant>('filled');

  protected readonly initials = computed(() => projectInitials(this.name()));
  protected readonly cls = computed(() =>
    `project-avatar project-avatar--${this.size()} project-avatar--${this.variant()}`,
  );
}
