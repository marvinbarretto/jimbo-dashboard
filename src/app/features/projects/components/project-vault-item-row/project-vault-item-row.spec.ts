import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ProjectVaultItemRow } from './project-vault-item-row';
import type { VaultItem } from '@domain/vault/vault-item';
import { vaultItemId } from '@domain/ids';

function makeItem(overrides: Partial<VaultItem> = {}): VaultItem {
  return {
    id: vaultItemId('11111111-1111-1111-1111-111111111111'),
    seq: 42,
    title: 'Review backlog',
    body: '',
    type: 'task',
    category: null,
    assigned_to: null,
    tags: [],
    acceptance_criteria: [],
    grooming_status: 'classified',
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: null,
    parent_id: null,
    is_epic: false,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ProjectVaultItemRow', () => {
  let fixture: ComponentFixture<ProjectVaultItemRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectVaultItemRow],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectVaultItemRow);
  });

  it('reports the lifecycle state via state()', async () => {
    fixture.componentRef.setInput('item', makeItem());
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('active');
  });

  it('reports done when completed_at is set', async () => {
    fixture.componentRef.setInput('item', makeItem({ completed_at: '2025-02-02T00:00:00Z' }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('done');
  });

  it('reports archived when archived_at is set', async () => {
    fixture.componentRef.setInput('item', makeItem({ archived_at: '2025-02-02T00:00:00Z' }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('archived');
  });

  it('latest() prefers latest_activity_at over created_at', async () => {
    fixture.componentRef.setInput('item', makeItem({
      created_at: '2025-01-01T00:00:00Z',
      latest_activity_at: '2025-03-01T00:00:00Z',
    }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.latest()).toBe('2025-03-01T00:00:00Z');
  });
});
