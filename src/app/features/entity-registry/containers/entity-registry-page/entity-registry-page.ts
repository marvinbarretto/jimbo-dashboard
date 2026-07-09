import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EntityRegistryService } from '../../data-access/entity-registry.service';
import type { EntityRegistryKind } from '@domain/entity-registry';

type KindFilter = 'all' | EntityRegistryKind;

@Component({
  selector: 'app-entity-registry-page',
  imports: [FormsModule],
  templateUrl: './entity-registry-page.html',
  styleUrl: './entity-registry-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityRegistryPage implements OnInit {
  private readonly entityRegistryService = inject(EntityRegistryService);

  readonly kinds: readonly KindFilter[] = ['all', 'person', 'place', 'org', 'thing'];

  readonly loading = this.entityRegistryService.loading;
  readonly resolvedCount = this.entityRegistryService.resolvedCount;
  readonly unresolvedCount = this.entityRegistryService.unresolvedCount;

  readonly search = signal('');
  readonly kindFilter = signal<KindFilter>('all');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const kind = this.kindFilter();
    return this.entityRegistryService.entities()
      .filter(e => kind === 'all' || e.kind === kind)
      .filter(e => !q || e.name.toLowerCase().includes(q) || e.aliases.some(a => a.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    this.entityRegistryService.load();
  }

  setKindFilter(kind: KindFilter): void {
    this.kindFilter.set(kind);
  }
}
