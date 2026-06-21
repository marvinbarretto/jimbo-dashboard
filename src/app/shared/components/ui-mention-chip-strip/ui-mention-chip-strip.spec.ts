import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { UiMentionChipStrip, type MentionRelatedRef } from './ui-mention-chip-strip';
import { actorId, projectId, vaultItemId , wellKnownActorId} from '@domain/ids';
import type { Project } from '@domain/projects/project';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects/project';
import type { Actor } from '@domain/actors/actor';

// The strip composes two visual surfaces:
//   - Tags    → <app-tag-chip> (free-text labels, no entity backing)
//   - Projects / assignee / related → delegated to <app-entity-chip>
//     (classes: `.entity-chip--project`, `.entity-chip--actor`, `.entity-chip--vault-item`)
//
// Assertions target the actual rendered DOM rather than legacy `.ui-mcs__chip--*`
// names that the strip no longer emits.

const proj = (id: string, color: string | null = null): Project => ({
  id: projectId(id),
  display_name: id,
  description: null,
  status: 'active',
  kind: 'minor',
  owner_actor_id: wellKnownActorId('marvin'),
  criteria: null,
  repo_url: null,
  color_token: color,
  created_at: '2026-01-01T00:00:00Z',
  ...EMPTY_PROJECT_BRIEF,
});

const actor = (id: string): Actor => ({
  id: actorId(id),
  display_name: id,
  kind: 'human',
  runtime: null,
  description: null,
  is_active: true,
  serves: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

function build() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
    imports: [UiMentionChipStrip],
  });
  const fixture = TestBed.createComponent(UiMentionChipStrip);
  fixture.detectChanges();
  return fixture;
}

describe('UiMentionChipStrip', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders nothing when all categories are empty', () => {
    const fixture = build();
    expect(fixture.nativeElement.querySelector('.ui-mcs')).toBeNull();
  });

  it('renders a chip per tag with × buttons', () => {
    const fixture = build();
    fixture.componentRef.setInput('tags', ['urgent', 'bug']);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('app-tag-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain('#urgent');
    expect(chips[1].textContent).toContain('#bug');
  });

  it('renders project chips via entity-chip with the project label', () => {
    const fixture = build();
    fixture.componentRef.setInput('projects', [proj('hermes', '#abc123')]);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.entity-chip--project');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('hermes');
    // Color is plumbed through as a CSS custom property on the chip, not a
    // separate dot element — assert the variable is set rather than a `.dot` node.
    expect(chip.getAttribute('style') ?? '').toContain('--chip-color');
  });

  it('renders the single assignee chip with @-prefix', () => {
    const fixture = build();
    fixture.componentRef.setInput('assignee', actor('boris'));
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('.entity-chip--actor');
    expect(chip.textContent).toContain('@');
    expect(chip.textContent).toContain('boris');
  });

  it('renders related chips with # prefix and seq, omitting the seq when null', () => {
    const fixture = build();
    const related: MentionRelatedRef[] = [
      { id: vaultItemId('a'), title: 'parent', seq: 12 },
      { id: vaultItemId('b'), title: 'no-seq', seq: null },
    ];
    fixture.componentRef.setInput('related', related);
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('.entity-chip--vault-item');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain('12');
    expect(chips[0].textContent).toContain('parent');
    // null-seq chip has no `.entity-chip__seq` element — that's how the absent
    // seq is conveyed (rather than text-level inspection).
    expect(chips[1].querySelector('.entity-chip__seq')).toBeNull();
    expect(chips[1].textContent).toContain('no-seq');
  });

  it('emits tagRemoved with index when × is clicked', () => {
    const fixture = build();
    fixture.componentRef.setInput('tags', ['a', 'b', 'c']);
    fixture.detectChanges();
    const emitted: number[] = [];
    fixture.componentInstance.tagRemoved.subscribe(i => emitted.push(i));
    const buttons = fixture.nativeElement.querySelectorAll('app-tag-chip .tag-chip__remove');
    (buttons[1] as HTMLButtonElement).click();
    expect(emitted).toEqual([1]);
  });

  it('emits projectRemoved / assigneeRemoved / relatedRemoved on entity-chip × clicks', () => {
    const fixture = build();
    fixture.componentRef.setInput('projects', [proj('hermes')]);
    fixture.componentRef.setInput('assignee', actor('marvin'));
    fixture.componentRef.setInput('related', [
      { id: vaultItemId('a'), title: 'a', seq: 1 },
    ]);
    fixture.detectChanges();

    const projOut: number[] = [];
    let assigneeOut = 0;
    const relOut: number[] = [];
    fixture.componentInstance.projectRemoved.subscribe(i => projOut.push(i));
    fixture.componentInstance.assigneeRemoved.subscribe(() => assigneeOut += 1);
    fixture.componentInstance.relatedRemoved.subscribe(i => relOut.push(i));

    (fixture.nativeElement.querySelector('.entity-chip--project .entity-chip__remove') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.entity-chip--actor .entity-chip__remove') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.entity-chip--vault-item .entity-chip__remove') as HTMLButtonElement).click();

    expect(projOut).toEqual([0]);
    expect(assigneeOut).toBe(1);
    expect(relOut).toEqual([0]);
  });
});
